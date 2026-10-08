-- ============================================================
-- El cobro de una factura se carga desde Caja
-- ============================================================
--
-- "+ Cobro" en Pagos era la única forma de cobrar una factura de venta que ya
-- existía (por ejemplo, un presupuesto convertido en factura). Al dejar Caja
-- como única entrada, ese camino tenía que mudarse, no desaparecer.
--
-- De paso se arregla algo que iba a morder: `trg_etiquetar_caja_venta` marcaba
-- `factura_venta_id` en el movimiento de caja de CUALQUIER cobro imputado a una
-- factura. Con cobros cargados desde Caja, un cobro común quedaría marcado como
-- venta y `eliminar_movimiento_caja` lo trataría como tal: borraría la factura
-- entera y devolvería el stock, cuando lo único que había que deshacer era el
-- cobro.
--
-- Ahora la marca la pone sólo `registrar_venta_caja`, que es la única operación
-- donde el movimiento de caja ES la venta.

create or replace function marcar_caja_como_venta(p_pago_id uuid, p_factura_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_numero text;
begin
  select numero into v_numero from facturas_venta where id = p_factura_id;

  update movimientos_caja
     set concepto         = 'Venta ' || coalesce(v_numero, ''),
         factura_venta_id = p_factura_id
   where pago_id = p_pago_id;
end;
$$;

revoke execute on function marcar_caja_como_venta(uuid, uuid) from public, anon, authenticated;

-- El trigger deja de existir: la marca ahora es explícita.
drop trigger if exists trg_etiquetar_caja_venta on pago_facturas;
drop function if exists fn_etiquetar_caja_venta();

create or replace function registrar_venta_caja(
  p_total       numeric,
  p_medio_pago  text,
  p_fecha       date,
  p_items       jsonb,
  p_cliente_id  uuid    default null,
  p_iva         numeric default 0,
  p_notas       text    default null
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

  select * into v_movimiento from movimientos_caja where pago_id = v_pago.id;
  return v_movimiento;
end;
$$;

-- ── INGRESO por cobro de una factura ya emitida ──────────────────────────────
-- El espejo del egreso a proveedor: se elige el cliente, se ven sus facturas con
-- saldo y se reparte el monto. La imputación puede ser parcial, igual que del
-- lado de las compras. El movimiento NO queda marcado como venta: la venta ya
-- había ocurrido, esto sólo cobra lo que se debía.
create or replace function registrar_cobro_caja(
  p_cliente_id   uuid,
  p_monto        numeric,
  p_medio_pago   text,
  p_fecha        date,
  p_imputaciones jsonb default '[]'::jsonb,
  p_notas        text  default null
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

  select * into v_movimiento from movimientos_caja where pago_id = v_pago.id;
  return v_movimiento;
end;
$$;

revoke execute on function registrar_cobro_caja(uuid, numeric, text, date, jsonb, text) from public, anon;
revoke execute on function registrar_venta_caja(numeric, text, date, jsonb, uuid, numeric, text) from public, anon;

notify pgrst, 'reload schema';
