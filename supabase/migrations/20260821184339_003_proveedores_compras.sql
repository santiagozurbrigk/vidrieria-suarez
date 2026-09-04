-- ============================================================
-- Migration 003: Proveedores + Facturas de Compra
-- ============================================================

create table proveedores (
  id            uuid           primary key default gen_random_uuid(),
  razon_social  text           not null,
  cuit          text,
  condicion_iva condicion_iva,
  contacto      text,
  telefono      text,
  email         text,
  direccion     text,
  alias_cbu     text,
  cbu           text,
  notas         text,
  activo        boolean        not null default true,
  created_at    timestamptz    not null default now(),
  updated_at    timestamptz    not null default now()
);

create trigger trg_proveedores_updated_at
  before update on proveedores
  for each row execute function fn_set_updated_at();

create table facturas_compra (
  id                   uuid          primary key default gen_random_uuid(),
  proveedor_id         uuid          not null references proveedores(id),
  numero               text          not null,
  fecha                date          not null default current_date,
  tipo_comprobante     text          not null default 'FACTURA',
  subtotal             numeric(12,2) not null default 0,
  iva                  numeric(12,2) not null default 0,
  total                numeric(12,2) not null,
  saldo_pendiente      numeric(12,2) not null,
  estado               estado_factura not null default 'PENDIENTE',
  archivo_adjunto_path text,
  notas                text,
  created_by           uuid          not null references profiles(id),
  created_at           timestamptz   not null default now(),
  updated_at           timestamptz   not null default now()
);

create trigger trg_facturas_compra_updated_at
  before update on facturas_compra
  for each row execute function fn_set_updated_at();

create table factura_compra_items (
  id                uuid          primary key default gen_random_uuid(),
  factura_compra_id uuid          not null references facturas_compra(id) on delete cascade,
  producto_id       uuid          not null references productos(id),
  cantidad          numeric(12,3) not null check (cantidad > 0),
  costo_unitario    numeric(12,2) not null check (costo_unitario >= 0),
  subtotal          numeric(12,2) not null,
  created_at        timestamptz   not null default now()
);

-- Agregar FK de movimientos_stock a facturas_compra
alter table movimientos_stock
  add constraint fk_mov_factura_compra
  foreign key (factura_compra_id) references facturas_compra(id);

-- Trigger: costeo automático al registrar un ítem de compra
create or replace function fn_actualizar_costo_producto()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update productos
  set
    costo_actual    = new.costo_unitario,
    precio_venta    = round(new.costo_unitario * (1 + margen_ganancia / 100), 2),
    updated_at      = now()
  where id = new.producto_id;
  return new;
end;
$$;

create trigger trg_costeo_automatico
  after insert on factura_compra_items
  for each row execute function fn_actualizar_costo_producto();

-- Trigger: entrada de stock al registrar un ítem de compra
create or replace function fn_stock_entrada_compra()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_usuario_id uuid;
begin
  select created_by into v_usuario_id from facturas_compra where id = new.factura_compra_id;

  insert into movimientos_stock (producto_id, tipo, cantidad, motivo, factura_compra_id, usuario_id)
  values (new.producto_id, 'ENTRADA', new.cantidad, 'Compra — factura ' || new.factura_compra_id, new.factura_compra_id, v_usuario_id);

  return new;
end;
$$;

create trigger trg_stock_entrada_compra
  after insert on factura_compra_items
  for each row execute function fn_stock_entrada_compra();

-- RLS: proveedores (solo Admin)
alter table proveedores enable row level security;
create policy "admin_all_proveedores" on proveedores for all using (public.is_admin());

-- RLS: facturas_compra (solo Admin)
alter table facturas_compra enable row level security;
create policy "admin_all_facturas_compra" on facturas_compra for all using (public.is_admin());

-- RLS: factura_compra_items (solo Admin)
alter table factura_compra_items enable row level security;
create policy "admin_all_factura_compra_items" on factura_compra_items for all using (public.is_admin());
