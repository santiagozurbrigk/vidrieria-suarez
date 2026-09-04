-- ============================================================
-- Migration 007: Pagos + Imputaciones
-- ============================================================

create table pagos (
  id           uuid          primary key default gen_random_uuid(),
  tipo         tipo_pago     not null,
  cliente_id   uuid          references clientes(id),
  proveedor_id uuid          references proveedores(id),
  monto        numeric(12,2) not null check (monto > 0),
  medio_pago   text          not null,
  fecha        date          not null default current_date,
  notas        text,
  created_by   uuid          not null references profiles(id),
  created_at   timestamptz   not null default now()
);

create table pago_facturas (
  id                uuid          primary key default gen_random_uuid(),
  pago_id           uuid          not null references pagos(id) on delete cascade,
  factura_venta_id  uuid          references facturas_venta(id),
  factura_compra_id uuid          references facturas_compra(id),
  monto_imputado    numeric(12,2) not null check (monto_imputado > 0),
  created_at        timestamptz   not null default now(),
  constraint check_una_sola_factura check (
    (factura_venta_id is null) != (factura_compra_id is null)
  )
);

-- FK de movimientos_caja a pagos
alter table movimientos_caja
  add constraint fk_caja_pago foreign key (pago_id) references pagos(id);

-- Trigger: validar que suma de imputaciones no supere el monto del pago
create or replace function fn_validar_imputacion_pago()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_total_imputado numeric;
  v_monto_pago     numeric;
begin
  select coalesce(sum(monto_imputado), 0) into v_total_imputado
  from pago_facturas
  where pago_id = new.pago_id
    and id is distinct from new.id;

  select monto into v_monto_pago from pagos where id = new.pago_id;

  if (v_total_imputado + new.monto_imputado) > v_monto_pago then
    raise exception 'La suma de imputaciones (%) supera el monto del pago (%)',
      v_total_imputado + new.monto_imputado, v_monto_pago;
  end if;
  return new;
end;
$$;

create constraint trigger trg_validar_imputacion_pago
  after insert or update on pago_facturas
  deferrable initially immediate
  for each row execute function fn_validar_imputacion_pago();

-- Trigger: actualizar saldo de factura de venta
create or replace function fn_saldo_factura_venta()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_total_imputado numeric;
  v_total          numeric;
  v_saldo          numeric;
  v_estado         estado_factura;
begin
  select coalesce(sum(monto_imputado), 0) into v_total_imputado
  from pago_facturas where factura_venta_id = new.factura_venta_id;

  select total into v_total from facturas_venta where id = new.factura_venta_id;
  v_saldo := greatest(v_total - v_total_imputado, 0);
  v_estado := case when v_saldo = 0 then 'PAGADA' when v_total_imputado > 0 then 'PARCIAL' else 'PENDIENTE' end::estado_factura;

  update facturas_venta set saldo_pendiente = v_saldo, estado = v_estado, updated_at = now()
  where id = new.factura_venta_id;
  return new;
end;
$$;

create trigger trg_saldo_factura_venta
  after insert on pago_facturas
  for each row when (new.factura_venta_id is not null)
  execute function fn_saldo_factura_venta();

-- Trigger: actualizar saldo de factura de compra
create or replace function fn_saldo_factura_compra()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_total_imputado numeric;
  v_total          numeric;
  v_saldo          numeric;
  v_estado         estado_factura;
begin
  select coalesce(sum(monto_imputado), 0) into v_total_imputado
  from pago_facturas where factura_compra_id = new.factura_compra_id;

  select total into v_total from facturas_compra where id = new.factura_compra_id;
  v_saldo := greatest(v_total - v_total_imputado, 0);
  v_estado := case when v_saldo = 0 then 'PAGADA' when v_total_imputado > 0 then 'PARCIAL' else 'PENDIENTE' end::estado_factura;

  update facturas_compra set saldo_pendiente = v_saldo, estado = v_estado, updated_at = now()
  where id = new.factura_compra_id;
  return new;
end;
$$;

create trigger trg_saldo_factura_compra
  after insert on pago_facturas
  for each row when (new.factura_compra_id is not null)
  execute function fn_saldo_factura_compra();

-- Trigger: pago → movimiento de caja automático
create or replace function fn_caja_por_pago()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into movimientos_caja (tipo, concepto, monto, medio_pago, fecha, pago_id, usuario_id)
  values (
    case when new.tipo = 'COBRO_CLIENTE' then 'INGRESO' else 'EGRESO' end::tipo_movimiento_caja,
    case when new.tipo = 'COBRO_CLIENTE' then 'Cobro a cliente' else 'Pago a proveedor' end,
    new.monto, new.medio_pago, new.fecha::timestamptz, new.id, new.created_by
  );
  return new;
end;
$$;

create trigger trg_caja_por_pago
  after insert on pagos
  for each row execute function fn_caja_por_pago();

-- RLS: pagos
alter table pagos          enable row level security;
alter table pago_facturas  enable row level security;

create policy "admin_all_pagos"             on pagos         for all    using (public.is_admin());
create policy "vendedor_insert_cobros"      on pagos         for insert with check (public.is_vendedor_or_above() and tipo = 'COBRO_CLIENTE');
create policy "vendedor_view_pagos"         on pagos         for select using (public.is_vendedor_or_above());
create policy "admin_all_pago_facturas"     on pago_facturas for all    using (public.is_admin());
create policy "vendedor_insert_imputacion"  on pago_facturas for insert with check (public.is_vendedor_or_above() and factura_venta_id is not null);
create policy "vendedor_view_pago_facturas" on pago_facturas for select using (public.is_vendedor_or_above());
