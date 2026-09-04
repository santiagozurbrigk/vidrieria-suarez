-- ============================================================
-- Migration 005: Arquitectos + Presupuestos
-- ============================================================

create table arquitectos (
  id         uuid        primary key default gen_random_uuid(),
  nombre     text        not null,
  apellido   text,
  estudio    text,
  telefono   text,
  email      text,
  direccion  text,
  notas      text,
  activo     boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_arquitectos_updated_at
  before update on arquitectos
  for each row execute function fn_set_updated_at();

create table presupuestos (
  id                        uuid          primary key default gen_random_uuid(),
  arquitecto_id             uuid          not null references arquitectos(id),
  cliente_id                uuid          references clientes(id),
  obra                      text,
  numero                    text          not null,
  fecha                     date          not null default current_date,
  validez_dias              int           not null default 30,
  total                     numeric(12,2) not null default 0,
  estado                    text          not null default 'BORRADOR',
  convertido_en_factura_id  uuid          references facturas_venta(id),
  notas                     text,
  created_by                uuid          not null references profiles(id),
  created_at                timestamptz   not null default now(),
  updated_at                timestamptz   not null default now()
);

create trigger trg_presupuestos_updated_at
  before update on presupuestos
  for each row execute function fn_set_updated_at();

create table presupuesto_items (
  id             uuid          primary key default gen_random_uuid(),
  presupuesto_id uuid          not null references presupuestos(id) on delete cascade,
  producto_id    uuid          references productos(id),
  descripcion    text          not null,
  cantidad       numeric(12,3) not null check (cantidad > 0),
  precio_unitario numeric(12,2) not null,
  subtotal       numeric(12,2) not null,
  created_at     timestamptz   not null default now()
);

-- Trigger: recalcular total del presupuesto ante cambios en sus ítems
create or replace function fn_actualizar_total_presupuesto()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update presupuestos
  set
    total      = (select coalesce(sum(subtotal), 0) from presupuesto_items
                  where presupuesto_id = coalesce(new.presupuesto_id, old.presupuesto_id)),
    updated_at = now()
  where id = coalesce(new.presupuesto_id, old.presupuesto_id);
  return coalesce(new, old);
end;
$$;

create trigger trg_total_presupuesto
  after insert or update or delete on presupuesto_items
  for each row execute function fn_actualizar_total_presupuesto();

-- RLS
alter table arquitectos       enable row level security;
alter table presupuestos       enable row level security;
alter table presupuesto_items  enable row level security;

create policy "admin_vendedor_all_arquitectos"      on arquitectos      for all using (public.is_vendedor_or_above());
create policy "admin_vendedor_all_presupuestos"     on presupuestos     for all using (public.is_vendedor_or_above());
create policy "admin_vendedor_all_presupuesto_items" on presupuesto_items for all using (public.is_vendedor_or_above());
