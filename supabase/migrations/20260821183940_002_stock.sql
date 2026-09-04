-- ============================================================
-- Migration 002: Stock (productos, movimientos_stock)
-- ============================================================

create table productos (
  id              uuid            primary key default gen_random_uuid(),
  nombre          text            not null,
  descripcion     text,
  categoria       categoria_producto not null,
  unidad_medida   unidad_medida   not null,
  costo_actual    numeric(12,2)   not null default 0,
  margen_ganancia numeric(5,2)    not null default 30,
  precio_venta    numeric(12,2)   not null default 0,
  stock_actual    numeric(12,3)   not null default 0,
  stock_minimo    numeric(12,3)   not null default 0,
  activo          boolean         not null default true,
  created_at      timestamptz     not null default now(),
  updated_at      timestamptz     not null default now()
);

create trigger trg_productos_updated_at
  before update on productos
  for each row execute function fn_set_updated_at();

create table movimientos_stock (
  id                uuid               primary key default gen_random_uuid(),
  producto_id       uuid               not null references productos(id),
  tipo              tipo_movimiento_stock not null,
  cantidad          numeric(12,3)      not null check (cantidad > 0),
  motivo            text,
  fecha             timestamptz        not null default now(),
  factura_compra_id uuid,
  factura_venta_id  uuid,
  usuario_id        uuid               not null references profiles(id),
  created_at        timestamptz        not null default now()
);

-- Vista: productos con stock bajo mínimo
create or replace view v_productos_bajo_minimo as
  select * from productos
  where stock_actual <= stock_minimo and activo = true;

-- Trigger: actualizar stock_actual al insertar un movimiento
create or replace function fn_actualizar_stock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  case new.tipo
    when 'ENTRADA' then
      update productos set stock_actual = stock_actual + new.cantidad, updated_at = now()
      where id = new.producto_id;
    when 'SALIDA' then
      if (select stock_actual from productos where id = new.producto_id) < new.cantidad then
        raise exception 'Stock insuficiente para el producto %', new.producto_id;
      end if;
      update productos set stock_actual = stock_actual - new.cantidad, updated_at = now()
      where id = new.producto_id;
    when 'AJUSTE' then
      update productos set stock_actual = stock_actual + new.cantidad, updated_at = now()
      where id = new.producto_id;
  end case;
  return new;
end;
$$;

create trigger trg_actualizar_stock
  after insert on movimientos_stock
  for each row execute function fn_actualizar_stock();

-- RLS: productos
alter table productos enable row level security;
create policy "autenticados_ven_productos"
  on productos for select using (auth.role() = 'authenticated');
create policy "admin_deposito_modifican_productos"
  on productos for all using (public.get_user_rol() in ('ADMIN', 'DEPOSITO'));

-- RLS: movimientos_stock
alter table movimientos_stock enable row level security;
create policy "autenticados_ven_movimientos_stock"
  on movimientos_stock for select using (auth.role() = 'authenticated');
create policy "admin_deposito_insertan_movimientos"
  on movimientos_stock for insert
  with check (public.get_user_rol() in ('ADMIN', 'DEPOSITO'));
