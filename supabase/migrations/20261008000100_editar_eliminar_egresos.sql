-- ============================================================
-- Editar y eliminar cualquier egreso desde Gastos
-- ============================================================
--
-- En Gastos sólo se podían editar y borrar los gastos propios; los pagos a
-- proveedor mandaban a la pantalla de Pagos. Ahora toda fila se puede editar y
-- eliminar.
--
-- Para que eso sea seguro hay que arreglar algo de antes: los triggers que
-- ajustan el saldo de las facturas eran `after insert` solamente. Borrar un pago
-- cascadeaba sus imputaciones, pero el saldo de la factura NO volvía a subir: la
-- factura quedaba marcada como pagada aunque la plata se hubiera ido del
-- sistema. Lo mismo al cambiar el monto de una imputación.

-- ── Recálculo de saldos, en una función por tipo de factura ──────────────────
-- Se saca del trigger para poder llamarlo con el id de la factura vieja y el de
-- la nueva cuando una imputación se mueve de una factura a otra.
create or replace function recalcular_saldo_factura_compra(p_factura_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_imputado numeric;
  v_total    numeric;
  v_saldo    numeric;
begin
  if p_factura_id is null then return; end if;

  select total into v_total from facturas_compra where id = p_factura_id;
  if v_total is null then return; end if;

  select coalesce(sum(monto_imputado), 0) into v_imputado
    from pago_facturas where factura_compra_id = p_factura_id;

  v_saldo := greatest(v_total - v_imputado, 0);

  update facturas_compra
     set saldo_pendiente = v_saldo,
         estado = case
                    when v_saldo = 0     then 'PAGADA'
                    when v_imputado > 0  then 'PARCIAL'
                    else 'PENDIENTE'
                  end::estado_factura,
         updated_at = now()
   where id = p_factura_id;
end;
$$;

create or replace function recalcular_saldo_factura_venta(p_factura_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_imputado numeric;
  v_total    numeric;
  v_saldo    numeric;
begin
  if p_factura_id is null then return; end if;

  select total into v_total from facturas_venta where id = p_factura_id;
  if v_total is null then return; end if;

  select coalesce(sum(monto_imputado), 0) into v_imputado
    from pago_facturas where factura_venta_id = p_factura_id;

  v_saldo := greatest(v_total - v_imputado, 0);

  update facturas_venta
     set saldo_pendiente = v_saldo,
         estado = case
                    when v_saldo = 0     then 'PAGADA'
                    when v_imputado > 0  then 'PARCIAL'
                    else 'PENDIENTE'
                  end::estado_factura,
         updated_at = now()
   where id = p_factura_id;
end;
$$;

revoke execute on function recalcular_saldo_factura_compra(uuid) from public, anon, authenticated;
revoke execute on function recalcular_saldo_factura_venta(uuid)  from public, anon, authenticated;

-- ── Un solo trigger para insert, update y delete ─────────────────────────────
-- Antes eran dos triggers con `when (new... is not null)`, que no sirve en un
-- DELETE porque ahí `new` no existe. Ahora se resuelve adentro y se recalculan
-- las dos facturas involucradas por si la imputación cambió de factura.
create or replace function fn_saldo_por_imputacion()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform recalcular_saldo_factura_compra(old.factura_compra_id);
    perform recalcular_saldo_factura_venta(old.factura_venta_id);
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    perform recalcular_saldo_factura_compra(new.factura_compra_id);
    perform recalcular_saldo_factura_venta(new.factura_venta_id);
  end if;

  return coalesce(new, old);
end;
$$;

revoke execute on function fn_saldo_por_imputacion() from public, anon, authenticated;

drop trigger if exists trg_saldo_factura_compra on pago_facturas;
drop trigger if exists trg_saldo_factura_venta  on pago_facturas;
drop trigger if exists trg_saldo_por_imputacion on pago_facturas;

create trigger trg_saldo_por_imputacion
  after insert or update or delete on pago_facturas
  for each row execute function fn_saldo_por_imputacion();

-- ── Eliminar un egreso ───────────────────────────────────────────────────────
-- Se identifica por el movimiento de caja, que es lo que muestra la pantalla de
-- Gastos. Según de dónde venga se borra el gasto, el pago o el movimiento
-- suelto; las FK con ON DELETE CASCADE se llevan el movimiento de caja y las
-- imputaciones, y el trigger de arriba devuelve el saldo a las facturas.
create or replace function eliminar_egreso_caja(p_movimiento_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare v_mov movimientos_caja;
begin
  select * into v_mov from movimientos_caja where id = p_movimiento_id;
  if v_mov.id is null then
    raise exception 'El movimiento no existe o ya fue eliminado.';
  end if;
  if v_mov.tipo <> 'EGRESO' then
    raise exception 'Este movimiento no es un egreso.';
  end if;

  if v_mov.gasto_id is not null then
    delete from gastos where id = v_mov.gasto_id;
  elsif v_mov.pago_id is not null then
    delete from pagos where id = v_mov.pago_id;
  else
    -- Egreso cargado directo en caja, sin gasto ni pago detrás.
    delete from movimientos_caja where id = v_mov.id;
  end if;
end;
$$;

-- ── Editar un egreso ─────────────────────────────────────────────────────────
-- Un gasto se actualiza junto con su movimiento de caja, en la misma
-- transacción: antes eran dos UPDATE sueltos desde el cliente y si el segundo
-- fallaba la caja quedaba con el importe viejo.
--
-- Un pago a proveedor se actualiza y se le reemplazan las imputaciones: se
-- borran las que tenía (el trigger devuelve el saldo a esas facturas) y se
-- insertan las nuevas, que se validan contra el saldo ya restituido. Así el
-- monto se puede subir o bajar sin dejar ninguna factura inconsistente.
create or replace function actualizar_egreso_caja(
  p_movimiento_id uuid,
  p_monto         numeric,
  p_medio_pago    text,
  p_fecha         date,
  p_categoria     categoria_egreso default null,
  p_concepto      text             default null,
  p_proveedor_id  uuid             default null,
  p_imputaciones  jsonb            default '[]'::jsonb,
  p_notas         text             default null
)
returns movimientos_caja
language plpgsql
set search_path = public
as $$
declare
  v_mov        movimientos_caja;
  v_imp        jsonb;
  v_total_imp  numeric := 0;
  v_saldo      numeric;
  v_factura_id uuid;
  v_notas      text := nullif(btrim(coalesce(p_notas, '')), '');
  v_concepto   text := nullif(btrim(coalesce(p_concepto, '')), '');
begin
  select * into v_mov from movimientos_caja where id = p_movimiento_id;
  if v_mov.id is null then
    raise exception 'El movimiento no existe o ya fue eliminado.';
  end if;
  if v_mov.tipo <> 'EGRESO' then
    raise exception 'Este movimiento no es un egreso.';
  end if;
  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto debe ser mayor a cero.';
  end if;

  -- ── Pago a proveedor ──
  if v_mov.pago_id is not null then
    if p_proveedor_id is null then
      raise exception 'Elegí el proveedor al que se le pagó.';
    end if;

    select coalesce(sum((value->>'monto_imputado')::numeric), 0)
      into v_total_imp
      from jsonb_array_elements(coalesce(p_imputaciones, '[]'::jsonb));

    if v_total_imp > p_monto + 0.001 then
      raise exception 'Lo imputado a las facturas (%) supera el monto del pago (%).',
        v_total_imp, p_monto;
    end if;

    update pagos
       set proveedor_id = p_proveedor_id,
           monto        = p_monto,
           medio_pago   = p_medio_pago,
           fecha        = p_fecha,
           notas        = v_notas
     where id = v_mov.pago_id;

    -- Primero se sueltan las imputaciones viejas: el trigger devuelve el saldo a
    -- esas facturas, así la validación de abajo mira el saldo real sin este pago.
    delete from pago_facturas where pago_id = v_mov.pago_id;

    for v_imp in select * from jsonb_array_elements(coalesce(p_imputaciones, '[]'::jsonb)) loop
      v_factura_id := (v_imp->>'factura_compra_id')::uuid;

      select saldo_pendiente into v_saldo
        from facturas_compra
       where id = v_factura_id and proveedor_id = p_proveedor_id
         for update;

      if v_saldo is null then
        raise exception 'La factura elegida no es de este proveedor.';
      end if;

      if (v_imp->>'monto_imputado')::numeric > v_saldo + 0.01 then
        raise exception 'Lo cargado a una factura (%) supera su saldo pendiente (%).',
          (v_imp->>'monto_imputado')::numeric, v_saldo;
      end if;

      insert into pago_facturas (pago_id, factura_compra_id, monto_imputado)
      values (v_mov.pago_id, v_factura_id, (v_imp->>'monto_imputado')::numeric);
    end loop;

    -- El concepto del movimiento lo arma fn_caja_por_pago al crearlo; acá se
    -- refresca por si cambió el proveedor.
    update movimientos_caja
       set monto        = p_monto,
           medio_pago   = p_medio_pago,
           fecha        = p_fecha::timestamptz,
           proveedor_id = p_proveedor_id,
           concepto     = 'Pago a proveedor' ||
                          coalesce(' — ' || (select razon_social from proveedores
                                              where id = p_proveedor_id), '')
     where id = v_mov.id
    returning * into v_mov;

    return v_mov;
  end if;

  -- ── Gasto propio ──
  if v_concepto is null then
    raise exception 'Detallá de qué es el egreso.';
  end if;
  if p_categoria is null then
    raise exception 'Elegí la categoría del egreso.';
  end if;
  if p_categoria = 'PROVEEDOR' then
    raise exception 'Para que sea un pago a proveedor hay que cargarlo desde Caja, así se imputa a sus facturas.';
  end if;

  if v_mov.gasto_id is not null then
    update gastos
       set categoria_egreso = p_categoria,
           concepto         = v_concepto,
           monto            = p_monto,
           medio_pago       = p_medio_pago,
           fecha            = p_fecha,
           notas            = v_notas
     where id = v_mov.gasto_id;
  end if;

  update movimientos_caja
     set categoria_egreso = p_categoria,
         concepto         = v_concepto,
         monto            = p_monto,
         medio_pago       = p_medio_pago,
         fecha            = p_fecha::timestamptz
   where id = v_mov.id
  returning * into v_mov;

  return v_mov;
end;
$$;

revoke execute on function eliminar_egreso_caja(uuid) from public, anon;
revoke execute on function actualizar_egreso_caja(uuid, numeric, text, date, categoria_egreso, text, uuid, jsonb, text) from public, anon;
