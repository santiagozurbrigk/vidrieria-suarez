-- ============================================================
-- La fecha elegida se guarda en la zona del negocio
-- ============================================================
--
-- `movimientos_caja.fecha` es timestamptz, pero lo que se elige en la pantalla
-- es una fecha pelada. Al guardarla con `fecha::timestamptz`, PostgreSQL la
-- interpreta en la zona del SERVIDOR, que en Supabase es UTC:
--
--   elegís 2026-10-01
--   se guarda 2026-10-01 00:00:00+00
--   las vistas lo pasan a hora argentina (UTC−3) → 2026-09-30
--
-- Resultado: todo lo cargado el primero de un mes caía en el mes anterior, y en
-- la lista aparecía con el día de atrás.
--
-- Se guarda al MEDIODÍA de la zona del negocio en vez de a la medianoche: así
-- quedan doce horas de margen a cada lado y ninguna conversión de zona —ni la
-- del servidor, ni la del navegador, ni un cambio de horario de verano— puede
-- empujar la fecha al día de al lado.

create or replace function fecha_negocio(p_fecha date)
returns timestamptz
language sql
stable
set search_path = public
as $$
  select (p_fecha + time '12:00') at time zone 'America/Argentina/Buenos_Aires'
$$;

revoke execute on function fecha_negocio(date) from public, anon;

-- ── Los triggers que copian la fecha del gasto y del pago ───────────────────
create or replace function fn_caja_por_gasto()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into movimientos_caja (
    tipo, concepto, monto, medio_pago, fecha, gasto_id,
    categoria_egreso, proveedor_id, usuario_id
  ) values (
    'EGRESO', new.concepto, new.monto, new.medio_pago, fecha_negocio(new.fecha), new.id,
    new.categoria_egreso, new.proveedor_id, new.usuario_id
  );
  return new;
end;
$$;

create or replace function fn_caja_por_pago()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into movimientos_caja (
    tipo, concepto, monto, medio_pago, fecha, pago_id,
    categoria_egreso, proveedor_id, usuario_id
  ) values (
    case when new.tipo = 'COBRO_CLIENTE' then 'INGRESO' else 'EGRESO' end::tipo_movimiento_caja,
    case
      when new.tipo = 'COBRO_CLIENTE' then 'Cobro a cliente'
      else 'Pago a proveedor' ||
           coalesce(' — ' || (select razon_social from proveedores where id = new.proveedor_id), '')
    end,
    new.monto, new.medio_pago, fecha_negocio(new.fecha), new.id,
    case when new.tipo = 'PAGO_PROVEEDOR' then 'PROVEEDOR'::categoria_egreso end,
    new.proveedor_id,
    new.created_by
  );
  return new;
end;
$$;

-- ── Ingreso suelto ───────────────────────────────────────────────────────────
create or replace function registrar_ingreso_caja(
  p_concepto   text,
  p_monto      numeric,
  p_medio_pago text,
  p_fecha      date,
  p_notas      text default null
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

  insert into movimientos_caja (tipo, concepto, monto, medio_pago, fecha, usuario_id)
  values ('INGRESO', btrim(p_concepto), p_monto, p_medio_pago,
          fecha_negocio(p_fecha), auth.uid())
  returning * into v_movimiento;

  return v_movimiento;
end;
$$;

-- ── Editar un egreso: mismas dos conversiones de fecha ──────────────────────
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
           fecha        = fecha_negocio(p_fecha),
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
         fecha            = fecha_negocio(p_fecha)
   where id = v_mov.id
  returning * into v_mov;

  return v_mov;
end;
$$;

revoke execute on function actualizar_egreso_caja(uuid, numeric, text, date, categoria_egreso, text, uuid, jsonb, text) from public, anon;
revoke execute on function registrar_ingreso_caja(text, numeric, text, date, text) from public, anon;

-- ── Corregir los movimientos ya guardados ────────────────────────────────────
-- Los que entraron por el cast viejo quedaron a la medianoche UTC. Se los
-- reubica al mediodía de la zona del negocio, conservando el día que se había
-- elegido, que es el que se ve mirándolos en UTC.
--
-- Sólo se tocan los que están exactamente a las 00:00:00 UTC: ésos son,
-- inequívocamente, los que vinieron de una fecha pelada. Un movimiento guardado
-- con la hora real (`now()`) no se toca.
update movimientos_caja
   set fecha = fecha_negocio((fecha at time zone 'UTC')::date)
 where (fecha at time zone 'UTC')::time = '00:00:00';

notify pgrst, 'reload schema';
