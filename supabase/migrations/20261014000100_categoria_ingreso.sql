-- ============================================================
-- Los ingresos también llevan categoría
-- ============================================================
--
-- Los egresos ya se categorizaban (proveedor, servicio, retiro…). Los ingresos
-- no, así que no había forma de saber de dónde venía la plata que entraba.
--
-- Las categorías de ingreso son las unidades del negocio: Galpón, Vidriería y
-- Negocio. Van como enum, igual que las de egreso: son fijas, el código puede
-- ramificar sobre ellas y la base garantiza que no entre una inventada.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'categoria_ingreso') then
    create type categoria_ingreso as enum ('GALPON', 'VIDRIERIA', 'NEGOCIO');
  end if;
end $$;

alter table movimientos_caja add column if not exists categoria_ingreso categoria_ingreso;

-- Espejo de `categoria_solo_en_egresos`: la categoría de ingreso sólo tiene
-- sentido en un ingreso.
alter table movimientos_caja drop constraint if exists categoria_solo_en_ingresos;
alter table movimientos_caja
  add constraint categoria_solo_en_ingresos
  check (categoria_ingreso is null or tipo = 'INGRESO');

-- ── Vista: ingresos por categoría y mes ──────────────────────────────────────
-- Espejo de v_egresos_por_categoria_mes, para el gráfico de Caja.
create or replace view v_ingresos_por_categoria_mes as
  select
    date_trunc('month', (fecha at time zone 'America/Argentina/Buenos_Aires'))::date as mes,
    coalesce(categoria_ingreso::text, 'SIN_CATEGORIA') as categoria,
    sum(monto) as total,
    count(*)   as cantidad
  from movimientos_caja
  where tipo = 'INGRESO'
  group by 1, 2;

alter view v_ingresos_por_categoria_mes set (security_invoker = true);

-- ── La categoría del ingreso la pone una función, no la RPC ─────────────────
-- En la venta y en el cobro, el movimiento de caja lo crea el trigger
-- fn_caja_por_pago a partir del pago, así que la RPC no lo tiene todavía.
-- Modificar movimientos_caja exige ser admin, y un vendedor tiene que poder
-- vender, así que va SECURITY DEFINER igual que marcar_caja_como_venta.
create or replace function marcar_categoria_ingreso(
  p_pago_id   uuid,
  p_categoria categoria_ingreso
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_categoria is null then return; end if;

  update movimientos_caja
     set categoria_ingreso = p_categoria
   where pago_id = p_pago_id;
end;
$$;

revoke execute on function marcar_categoria_ingreso(uuid, categoria_ingreso) from public, anon, authenticated;

-- Las firmas cambian, así que se tiran las viejas antes de recrearlas.
drop function if exists registrar_venta_caja(numeric, text, date, jsonb, uuid, numeric, text);
drop function if exists registrar_cobro_caja(uuid, numeric, text, date, jsonb, text);
drop function if exists registrar_ingreso_caja(text, numeric, text, date, text);

create or replace function registrar_venta_caja(
  p_total       numeric,
  p_medio_pago  text,
  p_fecha       date,
  p_items       jsonb,
  p_cliente_id  uuid    default null,
  p_iva         numeric default 0,
  p_notas       text    default null,
  p_categoria   categoria_ingreso default null
)
returns movimientos_caja
language plpgsql
set search_path = public
as $$
declare
  v_cliente_id uuid;
  v_factura    facturas_venta;
  v_pago       pagos;
  v_movimiento movimientos_caja;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Elegí qué se vendió.';
  end if;
  if p_total is null or p_total <= 0 then
    raise exception 'El total de la venta debe ser mayor a cero.';
  end if;
  if coalesce(p_iva, 0) > p_total then
    raise exception 'El IVA no puede ser mayor que el total.';
  end if;

  v_cliente_id := coalesce(p_cliente_id, cliente_consumidor_final());

  insert into facturas_venta (
    cliente_id, numero, fecha, tipo_comprobante,
    subtotal, iva, total, saldo_pendiente, notas, created_by
  ) values (
    v_cliente_id,
    siguiente_numero('FACTURA_VENTA'),
    p_fecha,
    'TICKET',
    p_total - coalesce(p_iva, 0),
    coalesce(p_iva, 0),
    p_total,
    p_total,
    nullif(btrim(coalesce(p_notas, '')), ''),
    auth.uid()
  )
  returning * into v_factura;

  -- El trigger de stock corre por ítem y aborta todo si no alcanzan las
  -- existencias.
  insert into factura_venta_items (factura_venta_id, producto_id, cantidad, precio_unitario, subtotal)
  select
    v_factura.id,
    (i->>'producto_id')::uuid,
    (i->>'cantidad')::numeric,
    (i->>'precio_unitario')::numeric,
    (i->>'subtotal')::numeric
  from jsonb_array_elements(p_items) i;

  -- Cobro por el total: fn_caja_por_pago crea el INGRESO.
  insert into pagos (tipo, cliente_id, monto, medio_pago, fecha, notas, created_by)
  values ('COBRO_CLIENTE', v_cliente_id, p_total, p_medio_pago, p_fecha,
          nullif(btrim(coalesce(p_notas, '')), ''), auth.uid())
  returning * into v_pago;

  -- La imputación deja la factura en PAGADA por el trigger de saldos.
  insert into pago_facturas (pago_id, factura_venta_id, monto_imputado)
  values (v_pago.id, v_factura.id, p_total);

  -- Marcar el movimiento como venta. Va por una función SECURITY DEFINER y no
  -- con un UPDATE directo porque modificar movimientos_caja exige ser admin y un
  -- vendedor tiene que poder vender.
  perform marcar_caja_como_venta(v_pago.id, v_factura.id);
  perform marcar_categoria_ingreso(v_pago.id, p_categoria);

  select * into v_movimiento from movimientos_caja where pago_id = v_pago.id;
  return v_movimiento;
end;
$$;

create or replace function registrar_cobro_caja(
  p_cliente_id   uuid,
  p_monto        numeric,
  p_medio_pago   text,
  p_fecha        date,
  p_imputaciones jsonb default '[]'::jsonb,
  p_notas        text  default null,
  p_categoria    categoria_ingreso default null
)
returns movimientos_caja
language plpgsql
set search_path = public
as $$
declare
  v_pago       pagos;
  v_movimiento movimientos_caja;
  v_imp        jsonb;
  v_total_imp  numeric := 0;
  v_saldo      numeric;
  v_factura_id uuid;
begin
  if p_cliente_id is null then
    raise exception 'Elegí el cliente que pagó.';
  end if;
  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto debe ser mayor a cero.';
  end if;

  select coalesce(sum((value->>'monto_imputado')::numeric), 0)
    into v_total_imp
    from jsonb_array_elements(coalesce(p_imputaciones, '[]'::jsonb));

  if v_total_imp > p_monto + 0.001 then
    raise exception 'Lo imputado a las facturas (%) supera el monto del cobro (%).',
      v_total_imp, p_monto;
  end if;

  -- fn_caja_por_pago genera el INGRESO de caja.
  insert into pagos (tipo, cliente_id, monto, medio_pago, fecha, notas, created_by)
  values ('COBRO_CLIENTE', p_cliente_id, p_monto, p_medio_pago, p_fecha,
          nullif(btrim(coalesce(p_notas, '')), ''), auth.uid())
  returning * into v_pago;

  for v_imp in select * from jsonb_array_elements(coalesce(p_imputaciones, '[]'::jsonb)) loop
    v_factura_id := (v_imp->>'factura_venta_id')::uuid;

    -- Se bloquea la factura mientras se valida, para que dos cobros simultáneos
    -- no la dejen con saldo negativo.
    select saldo_pendiente into v_saldo
      from facturas_venta
     where id = v_factura_id and cliente_id = p_cliente_id
       for update;

    if v_saldo is null then
      raise exception 'La factura elegida no es de este cliente.';
    end if;

    if (v_imp->>'monto_imputado')::numeric > v_saldo + 0.01 then
      raise exception 'Lo cargado a una factura (%) supera su saldo pendiente (%).',
        (v_imp->>'monto_imputado')::numeric, v_saldo;
    end if;

    insert into pago_facturas (pago_id, factura_venta_id, monto_imputado)
    values (v_pago.id, v_factura_id, (v_imp->>'monto_imputado')::numeric);
  end loop;

  perform marcar_categoria_ingreso(v_pago.id, p_categoria);

  select * into v_movimiento from movimientos_caja where pago_id = v_pago.id;
  return v_movimiento;
end;
$$;

create or replace function registrar_ingreso_caja(
  p_concepto   text,
  p_monto      numeric,
  p_medio_pago text,
  p_fecha      date,
  p_notas      text default null,
  p_categoria  categoria_ingreso default null
)
returns movimientos_caja
language plpgsql
set search_path = public
as $$
declare v_movimiento movimientos_caja;
begin
  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto debe ser mayor a cero.';
  end if;
  if nullif(btrim(coalesce(p_concepto, '')), '') is null then
    raise exception 'Detallá de qué es el ingreso.';
  end if;

  insert into movimientos_caja (tipo, concepto, monto, medio_pago, fecha, categoria_ingreso, usuario_id)
  values ('INGRESO', btrim(p_concepto), p_monto, p_medio_pago,
          fecha_negocio(p_fecha), p_categoria, auth.uid())
  returning * into v_movimiento;

  return v_movimiento;
end;
$$;


revoke execute on function registrar_venta_caja(numeric, text, date, jsonb, uuid, numeric, text, categoria_ingreso) from public, anon;
revoke execute on function registrar_cobro_caja(uuid, numeric, text, date, jsonb, text, categoria_ingreso) from public, anon;
revoke execute on function registrar_ingreso_caja(text, numeric, text, date, text, categoria_ingreso) from public, anon;

notify pgrst, 'reload schema';
