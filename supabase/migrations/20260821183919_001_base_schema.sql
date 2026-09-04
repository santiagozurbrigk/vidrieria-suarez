-- ============================================================
-- Migration 001: Enums, Profiles, Auth helpers
-- ============================================================

create type rol_usuario       as enum ('ADMIN', 'VENDEDOR', 'DEPOSITO');
create type categoria_producto as enum ('VIDRIO', 'ALUMINIO', 'ACCESORIO', 'INSUMO');
create type unidad_medida      as enum ('UNIDAD', 'M2', 'ML');
create type tipo_movimiento_stock as enum ('ENTRADA', 'SALIDA', 'AJUSTE');
create type estado_factura     as enum ('PENDIENTE', 'PARCIAL', 'PAGADA');
create type tipo_pago          as enum ('COBRO_CLIENTE', 'PAGO_PROVEEDOR');
create type tipo_movimiento_caja as enum ('INGRESO', 'EGRESO', 'AJUSTE');
create type condicion_iva as enum ('RESPONSABLE_INSCRIPTO', 'MONOTRIBUTISTA', 'EXENTO', 'CONSUMIDOR_FINAL');

-- Profiles (extiende auth.users de Supabase)
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text          not null,
  rol        rol_usuario   not null default 'VENDEDOR',
  activo     boolean       not null default true,
  created_at timestamptz   not null default now()
);

-- Funciones de ayuda con security definer para evitar recursión en RLS
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select rol = 'ADMIN' and activo from profiles where id = auth.uid()), false)
$$;

create or replace function public.get_user_rol()
returns rol_usuario language sql stable security definer set search_path = public as $$
  select rol from profiles where id = auth.uid() and activo = true limit 1
$$;

create or replace function public.is_vendedor_or_above()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select rol in ('ADMIN', 'VENDEDOR') and activo from profiles where id = auth.uid()), false)
$$;

-- Función de updated_at genérica
create or replace function fn_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- Log de auditoría
create table audit_log (
  id         bigint generated always as identity primary key,
  usuario_id uuid references profiles(id),
  accion     text          not null,
  entidad    text          not null,
  entidad_id text,
  datos      jsonb,
  created_at timestamptz   not null default now()
);

-- RLS: profiles
alter table profiles enable row level security;
create policy "users_view_own_profile"  on profiles for select using (auth.uid() = id);
create policy "admin_all_profiles"      on profiles for all   using (public.is_admin());

-- RLS: audit_log
alter table audit_log enable row level security;
create policy "admin_view_audit_log"    on audit_log for select using (public.is_admin());
create policy "system_insert_audit_log" on audit_log for insert with check (true);

-- Trigger: auto-crear profile cuando se registra un usuario en auth
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nombre, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'rol')::rol_usuario, 'VENDEDOR')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
