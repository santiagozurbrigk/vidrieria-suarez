-- ============================================================
-- Migration 004: Clientes + Facturas de Venta + Remitos
-- ============================================================

create table clientes (
  id            uuid          primary key default gen_random_uuid(),
  nombre        text          not null,
  apellido      text,
  razon_social  text,
  cuit          text,
  condicion_iva condicion_iva,
  telefono      text,
  email         text,
  direccion     text,
  notas         text,
  activo        boolean       not null default true,
  created_at    timestamptz   not null default now(),
  updated_at    timestamptz   not null default now()
);

create trigger trg_clientes_updated_at
  before update on clientes
  for each row execute function fn_set_updated_at();

create table facturas_venta (
  id                   uuid          primary key default gen_random_uuid(),
  cliente_id           uuid          not null references clientes(id),
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

create trigger trg_facturas_venta_updated_at
  before update on facturas_venta
  for each row execute function fn_set_updated_at();

create table factura_venta_items (
  id               uuid          primary key default gen_random_uuid(),
  factura_venta_id uuid          not null references facturas_venta(id) on delete cascade,
  producto_id      uuid          not null references productos(id),
  cantidad         numeric(12,3) not null check (cantidad > 0),
  precio_unitario  numeric(12,2) not null check (precio_unitario >= 0),
  subtotal         numeric(12,2) not null,
  created_at       timestamptz   not null default now()
);

create table remitos (
  id               uuid        primary key default gen_random_uuid(),
  cliente_id       uuid        not null references clientes(id),
  factura_venta_id uuid        references facturas_venta(id),
  numero           text        not null,
  fecha            date        not null default current_date,
  estado           text        not null default 'PENDIENTE',
  archivo_adjunto_path text,
  notas            text,
  created_by       uuid        not null references profiles(id),
  created_at       timestamptz not null default now()
);

-- Agregar FK de movimientos_stock a facturas_venta
alter table movimientos_stock
  add constraint fk_mov_factura_venta
  foreign key (factura_venta_id) references facturas_venta(id);

-- Trigger: salida de stock al registrar ítem de venta (con validación)
create or replace function fn_stock_salida_venta()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_usuario_id   uuid;
  v_stock_actual numeric;
begin
  select stock_actual into v_stock_actual from productos where id = new.producto_id;

  if v_stock_actual < new.cantidad then
    raise exception 'Stock insuficiente para el producto (disponible: %, requerido: %)',
      v_stock_actual, new.cantidad;
  end if;

  select created_by into v_usuario_id from facturas_venta where id = new.factura_venta_id;

  insert into movimientos_stock (producto_id, tipo, cantidad, motivo, factura_venta_id, usuario_id)
  values (new.producto_id, 'SALIDA', new.cantidad, 'Venta — factura ' || new.factura_venta_id, new.factura_venta_id, v_usuario_id);

  return new;
end;
$$;

create trigger trg_stock_salida_venta
  after insert on factura_venta_items
  for each row execute function fn_stock_salida_venta();

-- RLS: clientes (Admin y Vendedor)
alter table clientes enable row level security;
create policy "admin_vendedor_all_clientes" on clientes for all using (public.is_vendedor_or_above());

-- RLS: facturas_venta
alter table facturas_venta enable row level security;
create policy "admin_vendedor_all_facturas_venta" on facturas_venta for all using (public.is_vendedor_or_above());

-- RLS: factura_venta_items
alter table factura_venta_items enable row level security;
create policy "admin_vendedor_all_fv_items" on factura_venta_items for all using (public.is_vendedor_or_above());

-- RLS: remitos
alter table remitos enable row level security;
create policy "admin_vendedor_all_remitos" on remitos for all using (public.is_vendedor_or_above());
