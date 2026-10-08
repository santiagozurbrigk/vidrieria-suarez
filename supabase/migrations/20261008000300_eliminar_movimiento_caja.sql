-- ============================================================
-- Eliminar cualquier movimiento desde Caja
-- ============================================================
--
-- Caja es la única vista de la plata, pero no tenía forma de sacar una fila. Un
-- movimiento mal cargado quedaba ahí para siempre afectando el saldo y los
-- gráficos, y Gastos sólo alcanza a los EGRESO: un ingreso o un ajuste mal
-- puesto no se podía tocar desde ningún lado.
--
-- Esta función borra la fila que sea y deshace lo que ese movimiento había
-- provocado:
--   venta          → devuelve el stock y borra la factura
--   pago proveedor → el saldo de sus facturas vuelve a quedar pendiente
--   gasto          → se va con su movimiento de caja
--   suelto         → se borra el movimiento

create or replace function eliminar_movimiento_caja(p_movimiento_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_mov     movimientos_caja;
  v_factura uuid;
  v_ms      record;
begin
  select * into v_mov from movimientos_caja where id = p_movimiento_id;
  if v_mov.id is null then
    raise exception 'El movimiento no existe o ya fue eliminado.';
  end if;

  v_factura := v_mov.factura_venta_id;

  -- ── Si era una venta, primero se deshace el movimiento de stock ──
  -- `movimientos_stock` referencia la factura sin cascade, así que borrar la
  -- factura sin esto fallaría; y aunque no fallara, el stock quedaría
  -- descontado por una venta que ya no existe.
  if v_factura is not null then
    for v_ms in select * from movimientos_stock where factura_venta_id = v_factura loop
      if v_ms.tipo = 'SALIDA' then
        update productos
           set stock_actual = stock_actual + v_ms.cantidad, updated_at = now()
         where id = v_ms.producto_id;
      elsif v_ms.tipo = 'ENTRADA' then
        update productos
           set stock_actual = greatest(stock_actual - v_ms.cantidad, 0), updated_at = now()
         where id = v_ms.producto_id;
      end if;
    end loop;

    delete from movimientos_stock where factura_venta_id = v_factura;

    -- Un remito o un presupuesto que apuntaban a esta factura sobreviven, sólo
    -- quedan desvinculados: borrarlos sería perder documentación de la entrega.
    update remitos      set factura_venta_id        = null where factura_venta_id = v_factura;
    update presupuestos set convertido_en_factura_id = null, estado = 'APROBADO'
     where convertido_en_factura_id = v_factura;
  end if;

  -- ── La fila en sí ──
  -- El movimiento de caja se va por la FK en cascada cuando hay gasto o pago.
  if v_mov.gasto_id is not null then
    delete from gastos where id = v_mov.gasto_id;
  elsif v_mov.pago_id is not null then
    -- Al borrar el pago, trg_saldo_por_imputacion devuelve el saldo a las
    -- facturas que tenía imputadas.
    delete from pagos where id = v_mov.pago_id;
  else
    delete from movimientos_caja where id = v_mov.id;
  end if;

  -- La factura de venta va al final: pago_facturas la referencia y recién ahora
  -- quedó libre.
  if v_factura is not null then
    delete from facturas_venta where id = v_factura;
  end if;
end;
$$;

-- Gastos sigue teniendo su propia puerta, que además verifica que la fila sea un
-- egreso, pero el borrado en sí es el mismo para no tener dos versiones.
create or replace function eliminar_egreso_caja(p_movimiento_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare v_tipo tipo_movimiento_caja;
begin
  select tipo into v_tipo from movimientos_caja where id = p_movimiento_id;
  if v_tipo is null then
    raise exception 'El movimiento no existe o ya fue eliminado.';
  end if;
  if v_tipo <> 'EGRESO' then
    raise exception 'Este movimiento no es un egreso.';
  end if;

  perform eliminar_movimiento_caja(p_movimiento_id);
end;
$$;

revoke execute on function eliminar_movimiento_caja(uuid) from public, anon;
revoke execute on function eliminar_egreso_caja(uuid)     from public, anon;
