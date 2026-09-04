-- ============================================================
-- Migration 006: Caja + Gastos
-- ============================================================

create table movimientos_caja (
  id         uuid               primary key default gen_random_uuid(),
  tipo       tipo_movimiento_caja not null,
  concepto   text               not null,
  monto      numeric(12,2)      not null check (monto > 0),
  medio_pago text,
  fecha      timestamptz        not null default now(),
  pago_id    uuid,
  gasto_id   uuid,
  usuario_id uuid               not null references profiles(id),
  created_at timestamptz        not null default now()
);

create table cierres_caja (
  id            uuid          primary key default gen_random_uuid(),
  fecha         date          not null unique,
  saldo_sistema numeric(12,2) not null,
  saldo_real    numeric(12,2),
  diferencia    numeric(12,2),
  estado        text          not null default 'ABIERTO',
  notas         text,
  usuario_id    uuid          not null references profiles(id),
  created_at    timestamptz   not null default now(),
  updated_at    timestamptz   not null default now()
);

create trigger trg_cierres_caja_updated_at
  before update on cierres_caja
  for each row execute function fn_set_updated_at();

create table categorias_gasto (
  id          uuid        primary key default gen_random_uuid(),
  nombre      text        not null unique,
  descripcion text,
  activo      boolean     not null default true,
  created_at  timestamptz not null default now()
);

create table gastos (
  id                   uuid          primary key default gen_random_uuid(),
  categoria_id         uuid          not null references categorias_gasto(id),
  concepto             text          not null,
  monto                numeric(12,2) not null check (monto > 0),
  medio_pago           text,
  fecha                date          not null default current_date,
  archivo_adjunto_path text,
  notas                text,
  usuario_id           uuid          not null references profiles(id),
  created_at           timestamptz   not null default now()
);

-- FK de movimientos_caja a gastos y pagos (pagos se crea en migration 007)
alter table movimientos_caja
  add constraint fk_caja_gasto foreign key (gasto_id) references gastos(id);

-- Vista: saldo de caja
create or replace view v_saldo_caja as
  select
    coalesce(sum(case when tipo = 'INGRESO' then monto else 0 end), 0)
      - coalesce(sum(case when tipo = 'EGRESO' then monto else 0 end), 0) as saldo_actual,
    coalesce(sum(case when tipo = 'INGRESO' then monto else 0 end), 0) as total_ingresos,
    coalesce(sum(case when tipo = 'EGRESO' then monto else 0 end), 0)  as total_egresos
  from movimientos_caja;

-- Trigger: gasto → movimiento de caja automático
create or replace function fn_caja_por_gasto()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into movimientos_caja (tipo, concepto, monto, medio_pago, fecha, gasto_id, usuario_id)
  values ('EGRESO', new.concepto, new.monto, new.medio_pago, new.fecha::timestamptz, new.id, new.usuario_id);
  return new;
end;
$$;

create trigger trg_caja_por_gasto
  after insert on gastos
  for each row execute function fn_caja_por_gasto();

-- Categorías de gasto por defecto
insert into categorias_gasto (nombre, descripcion) values
  ('Alquiler',          'Alquiler del local comercial'),
  ('Servicios',         'Luz, gas, agua, internet'),
  ('Sueldos',           'Sueldos y jornales del personal'),
  ('Mantenimiento',     'Reparaciones y mantenimiento del local'),
  ('Insumos de oficina','Papelería, impresión, etc.'),
  ('Transporte/Fletes', 'Fletes, combustible, etc.'),
  ('Impuestos y tasas', 'Impuestos municipales, nacionales, etc.'),
  ('Otros',             'Gastos varios no categorizados');

-- RLS
alter table movimientos_caja  enable row level security;
alter table cierres_caja      enable row level security;
alter table categorias_gasto  enable row level security;
alter table gastos             enable row level security;

create policy "admin_vendedor_view_caja"   on movimientos_caja for select using (public.is_vendedor_or_above());
create policy "admin_insert_caja"          on movimientos_caja for insert with check (public.is_admin());
create policy "admin_all_cierres_caja"     on cierres_caja     for all   using (public.is_admin());
create policy "autenticados_ven_categorias" on categorias_gasto for select using (auth.role() = 'authenticated');
create policy "admin_all_categorias_gasto" on categorias_gasto for all   using (public.is_admin());
create policy "admin_all_gastos"           on gastos            for all   using (public.is_admin());
