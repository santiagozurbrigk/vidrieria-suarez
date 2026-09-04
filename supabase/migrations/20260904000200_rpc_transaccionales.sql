-- Operaciones que tocan varias tablas, ahora atómicas.
--
-- Registrar una factura, un presupuesto o un pago implica escribir una cabecera
-- y sus ítems. Desde la app eso eran dos requests separados: si el segundo
-- fallaba (típicamente porque el trigger de stock rechaza la venta por
-- faltante), la cabecera ya había quedado escrita y el código intentaba
-- compensar con un DELETE manual que también puede fallar.
--
-- Cada función de acá corre dentro de una sola transacción: si algo falla en
-- el medio — incluido cualquier trigger — se revierte todo.
--
-- Todas son SECURITY INVOKER (el default): corren con los permisos del usuario
-- que llama, así que las políticas RLS se siguen aplicando igual que antes.

-- ── Factura de venta ──────────────────────────────────────────────────────────
--
-- p_items: [{ "producto_id": uuid, "cantidad": num, "precio_unitario": num, "subtotal": num }]
-- p_numero vacío o NULL ⇒ se asigna el siguiente número correlativo.

create or replace function crear_factura_venta(
  p_cliente_id       uuid,
  p_fecha            date,
  p_tipo_comprobante text,
  p_subtotal         numeric,
  p_iva              numeric,
  p_total            numeric,
  p_notas            text,
  p_items            jsonb,
  p_numero           text default null
)
returns facturas_venta
language plpgsql
as $$
declare
  v_factura facturas_venta;
  v_numero  text;
  v_item    jsonb;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La factura debe tener al menos un ítem';
  end if;

  v_numero := coalesce(nullif(btrim(p_numero), ''), siguiente_numero('FACTURA_VENTA'));

  insert into facturas_venta (
    cliente_id, numero, fecha, tipo_comprobante,
    subtotal, iva, total, saldo_pendiente, notas, created_by
  ) values (
    p_cliente_id,
    v_numero,
    p_fecha,
    coalesce(nullif(btrim(p_tipo_comprobante), ''), 'FACTURA'),
    p_subtotal,
    coalesce(p_iva, 0),
    p_total,
    p_total,
    nullif(btrim(coalesce(p_notas, '')), ''),
    auth.uid()
  )
  returning * into v_factura;

  -- El trigger de stock se dispara por cada ítem y aborta la transacción entera
  -- si no hay existencias suficientes.
  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into factura_venta_items (
      factura_venta_id, producto_id, cantidad, precio_unitario, subtotal
    ) values (
      v_factura.id,
      (v_item->>'producto_id')::uuid,
      (v_item->>'cantidad')::numeric,
      (v_item->>'precio_unitario')::numeric,
      (v_item->>'subtotal')::numeric
    );
  end loop;

  return v_factura;
end;
$$;

-- ── Factura de compra ─────────────────────────────────────────────────────────
--
-- p_items: cada ítem trae "producto_id" (producto existente) o "nombre_nuevo"
-- (producto a crear). Los productos nuevos se crean dentro de esta misma
-- transacción, así que si después falla la factura no quedan huérfanos en el
-- catálogo — que es exactamente lo que pasaba antes.
--
-- El margen del proveedor se aplica al producto recién creado, para que el
-- trigger de costeo calcule un precio de venta coherente desde el arranque.

create or replace function crear_factura_compra(
  p_proveedor_id     uuid,
  p_fecha            date,
  p_tipo_comprobante text,
  p_subtotal         numeric,
  p_iva              numeric,
  p_total            numeric,
  p_notas            text,
  p_items            jsonb,
  p_numero           text default null
)
returns facturas_compra
language plpgsql
as $$
declare
  v_factura     facturas_compra;
  v_numero      text;
  v_item        jsonb;
  v_producto_id uuid;
  v_margen      numeric;
  v_nombre      text;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La factura debe tener al menos un ítem';
  end if;

  select margen_ganancia into v_margen
    from proveedores where id = p_proveedor_id;

  if not found then
    raise exception 'Proveedor no encontrado';
  end if;

  v_numero := coalesce(nullif(btrim(p_numero), ''), siguiente_numero('FACTURA_COMPRA'));

  insert into facturas_compra (
    proveedor_id, numero, fecha, tipo_comprobante,
    subtotal, iva, total, saldo_pendiente, notas, created_by
  ) values (
    p_proveedor_id,
    v_numero,
    p_fecha,
    coalesce(nullif(btrim(p_tipo_comprobante), ''), 'FACTURA'),
    p_subtotal,
    coalesce(p_iva, 0),
    p_total,
    p_total,
    nullif(btrim(coalesce(p_notas, '')), ''),
    auth.uid()
  )
  returning * into v_factura;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_producto_id := nullif(v_item->>'producto_id', '')::uuid;

    if v_producto_id is null then
      v_nombre := nullif(btrim(coalesce(v_item->>'nombre_nuevo', '')), '');

      if v_nombre is null then
        raise exception 'Cada ítem debe traer producto_id o nombre_nuevo';
      end if;

      insert into productos (nombre, categoria, unidad_medida, costo_actual, margen_ganancia)
      values (
        v_nombre,
        coalesce(nullif(v_item->>'categoria', ''), 'INSUMO')::categoria_producto,
        coalesce(nullif(v_item->>'unidad_medida', ''), 'UNIDAD')::unidad_medida,
        (v_item->>'costo_unitario')::numeric,
        coalesce(v_margen, 0)
      )
      returning id into v_producto_id;
    end if;

    insert into factura_compra_items (
      factura_compra_id, producto_id, cantidad, costo_unitario, subtotal
    ) values (
      v_factura.id,
      v_producto_id,
      (v_item->>'cantidad')::numeric,
      (v_item->>'costo_unitario')::numeric,
      (v_item->>'subtotal')::numeric
    );
  end loop;

  return v_factura;
end;
$$;

-- ── Presupuesto ───────────────────────────────────────────────────────────────
--
-- p_items: [{ "producto_id": uuid|null, "descripcion": text, "cantidad": num,
--             "precio_unitario": num, "subtotal": num }]

create or replace function crear_presupuesto(
  p_arquitecto_id uuid,
  p_cliente_id    uuid,
  p_obra          text,
  p_fecha         date,
  p_validez_dias  int,
  p_notas         text,
  p_items         jsonb,
  p_numero        text default null
)
returns presupuestos
language plpgsql
as $$
declare
  v_presupuesto presupuestos;
  v_numero      text;
  v_item        jsonb;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'El presupuesto debe tener al menos un ítem';
  end if;

  v_numero := coalesce(nullif(btrim(p_numero), ''), siguiente_numero('PRESUPUESTO'));

  insert into presupuestos (
    arquitecto_id, cliente_id, obra, numero, fecha, validez_dias, notas, created_by
  ) values (
    p_arquitecto_id,
    p_cliente_id,
    nullif(btrim(coalesce(p_obra, '')), ''),
    v_numero,
    p_fecha,
    coalesce(p_validez_dias, 30),
    nullif(btrim(coalesce(p_notas, '')), ''),
    auth.uid()
  )
  returning * into v_presupuesto;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into presupuesto_items (
      presupuesto_id, producto_id, descripcion, cantidad, precio_unitario, subtotal
    ) values (
      v_presupuesto.id,
      nullif(v_item->>'producto_id', '')::uuid,
      v_item->>'descripcion',
      (v_item->>'cantidad')::numeric,
      (v_item->>'precio_unitario')::numeric,
      (v_item->>'subtotal')::numeric
    );
  end loop;

  -- El total lo recalcula el trigger sobre presupuesto_items; se relee para
  -- devolver la fila ya consolidada.
  select * into v_presupuesto from presupuestos where id = v_presupuesto.id;
  return v_presupuesto;
end;
$$;

-- ── Convertir presupuesto en factura ──────────────────────────────────────────

create or replace function convertir_presupuesto_en_factura(
  p_presupuesto_id uuid,
  p_numero         text default null
)
returns facturas_venta
language plpgsql
as $$
declare
  v_pres    presupuestos;
  v_factura facturas_venta;
  v_items   jsonb;
begin
  select * into v_pres from presupuestos where id = p_presupuesto_id for update;

  if not found then
    raise exception 'Presupuesto no encontrado';
  end if;

  if v_pres.convertido_en_factura_id is not null then
    raise exception 'El presupuesto ya fue convertido en factura';
  end if;

  if v_pres.cliente_id is null then
    raise exception 'El presupuesto debe tener un cliente para convertirse en factura';
  end if;

  -- Sólo los ítems con producto asociado pueden ir a una factura, porque la
  -- factura descuenta stock.
  select jsonb_agg(jsonb_build_object(
           'producto_id',     producto_id,
           'cantidad',        cantidad,
           'precio_unitario', precio_unitario,
           'subtotal',        subtotal
         ))
    into v_items
    from presupuesto_items
   where presupuesto_id = p_presupuesto_id
     and producto_id is not null;

  if v_items is null then
    raise exception 'Ningún ítem del presupuesto tiene producto asociado';
  end if;

  v_factura := crear_factura_venta(
    p_cliente_id       => v_pres.cliente_id,
    p_fecha            => current_date,
    p_tipo_comprobante => 'FACTURA',
    p_subtotal         => v_pres.total,
    p_iva              => 0,
    p_total            => v_pres.total,
    p_notas            => 'Generada desde el presupuesto ' || v_pres.numero,
    p_items            => v_items,
    p_numero           => p_numero
  );

  update presupuestos
     set convertido_en_factura_id = v_factura.id,
         estado = 'CONVERTIDO'
   where id = p_presupuesto_id;

  return v_factura;
end;
$$;

-- ── Pago con imputaciones ─────────────────────────────────────────────────────
--
-- p_imputaciones: [{ "factura_venta_id": uuid|null,
--                    "factura_compra_id": uuid|null,
--                    "monto_imputado": num }]

create or replace function registrar_pago(
  p_tipo         text,
  p_cliente_id   uuid,
  p_proveedor_id uuid,
  p_monto        numeric,
  p_medio_pago   text,
  p_fecha        date,
  p_notas        text,
  p_imputaciones jsonb default '[]'::jsonb
)
returns pagos
language plpgsql
as $$
declare
  v_pago       pagos;
  v_imp        jsonb;
  v_total_imp  numeric := 0;
  v_saldo      numeric;
  v_factura_id uuid;
begin
  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto del pago debe ser mayor a cero';
  end if;

  if p_tipo = 'COBRO_CLIENTE' and p_cliente_id is null then
    raise exception 'Seleccioná un cliente.';
  end if;

  if p_tipo = 'PAGO_PROVEEDOR' and p_proveedor_id is null then
    raise exception 'Seleccioná un proveedor.';
  end if;

  select coalesce(sum((value->>'monto_imputado')::numeric), 0)
    into v_total_imp
    from jsonb_array_elements(coalesce(p_imputaciones, '[]'::jsonb));

  if v_total_imp > p_monto + 0.001 then
    raise exception 'El total imputado (%) supera el monto del pago (%)', v_total_imp, p_monto;
  end if;

  -- El trigger de caja se dispara acá y genera el movimiento correspondiente.
  insert into pagos (tipo, cliente_id, proveedor_id, monto, medio_pago, fecha, notas, created_by)
  values (
    p_tipo::tipo_pago,
    p_cliente_id,
    p_proveedor_id,
    p_monto,
    p_medio_pago,
    p_fecha,
    nullif(btrim(coalesce(p_notas, '')), ''),
    auth.uid()
  )
  returning * into v_pago;

  for v_imp in select * from jsonb_array_elements(coalesce(p_imputaciones, '[]'::jsonb)) loop
    -- Se bloquea la factura para que dos cobros simultáneos no puedan dejar
    -- el saldo en negativo.
    if nullif(v_imp->>'factura_venta_id', '') is not null then
      v_factura_id := (v_imp->>'factura_venta_id')::uuid;
      select saldo_pendiente into v_saldo
        from facturas_venta where id = v_factura_id for update;
    else
      v_factura_id := (v_imp->>'factura_compra_id')::uuid;
      select saldo_pendiente into v_saldo
        from facturas_compra where id = v_factura_id for update;
    end if;

    if not found then
      raise exception 'Factura no encontrada';
    end if;

    if (v_imp->>'monto_imputado')::numeric > v_saldo + 0.01 then
      raise exception 'La imputación (%) supera el saldo pendiente de la factura (%)',
        (v_imp->>'monto_imputado')::numeric, v_saldo;
    end if;

    insert into pago_facturas (pago_id, factura_venta_id, factura_compra_id, monto_imputado)
    values (
      v_pago.id,
      nullif(v_imp->>'factura_venta_id', '')::uuid,
      nullif(v_imp->>'factura_compra_id', '')::uuid,
      (v_imp->>'monto_imputado')::numeric
    );
  end loop;

  return v_pago;
end;
$$;

-- ── Cobro directo sobre una factura de venta ──────────────────────────────────
-- Atajo de un solo paso para el botón "Registrar cobro" del listado de ventas.

create or replace function registrar_cobro_venta(
  p_factura_id uuid,
  p_monto      numeric,
  p_medio_pago text,
  p_fecha      date,
  p_notas      text default null
)
returns pagos
language plpgsql
as $$
declare
  v_factura facturas_venta;
begin
  select * into v_factura
    from facturas_venta where id = p_factura_id for update;

  if not found then
    raise exception 'Factura no encontrada';
  end if;

  if v_factura.estado = 'PAGADA' then
    raise exception 'La factura ya está completamente pagada';
  end if;

  if p_monto > v_factura.saldo_pendiente + 0.01 then
    raise exception 'El monto (%) supera el saldo pendiente (%)',
      p_monto, v_factura.saldo_pendiente;
  end if;

  return registrar_pago(
    p_tipo         => 'COBRO_CLIENTE',
    p_cliente_id   => v_factura.cliente_id,
    p_proveedor_id => null,
    p_monto        => p_monto,
    p_medio_pago   => p_medio_pago,
    p_fecha        => p_fecha,
    p_notas        => p_notas,
    p_imputaciones => jsonb_build_array(
      jsonb_build_object('factura_venta_id', p_factura_id, 'monto_imputado', p_monto)
    )
  );
end;
$$;

-- ── Remito ────────────────────────────────────────────────────────────────────

create or replace function crear_remito(
  p_cliente_id       uuid,
  p_fecha            date,
  p_factura_venta_id uuid  default null,
  p_notas            text  default null,
  p_numero           text  default null
)
returns remitos
language plpgsql
as $$
declare
  v_remito remitos;
begin
  insert into remitos (cliente_id, factura_venta_id, numero, fecha, estado, notas, created_by)
  values (
    p_cliente_id,
    p_factura_venta_id,
    coalesce(nullif(btrim(p_numero), ''), siguiente_numero('REMITO')),
    p_fecha,
    'PENDIENTE',
    nullif(btrim(coalesce(p_notas, '')), ''),
    auth.uid()
  )
  returning * into v_remito;

  return v_remito;
end;
$$;

-- ── Recalcular precios de un proveedor ────────────────────────────────────────
--
-- Antes esto era un bucle en TypeScript que hacía un UPDATE por producto,
-- ignorando el resultado de cada uno. Ahora es una sola sentencia y devuelve
-- cuántos productos actualizó.

create or replace function recalcular_precios_proveedor(p_proveedor_id uuid)
returns integer
language plpgsql
as $$
declare
  v_margen    numeric;
  v_afectados integer;
begin
  select margen_ganancia into v_margen
    from proveedores where id = p_proveedor_id;

  if not found then
    raise exception 'Proveedor no encontrado';
  end if;

  update productos p
     set margen_ganancia = v_margen,
         precio_venta    = round(p.costo_actual * (1 + v_margen / 100), 2)
   where p.id in (
     select distinct i.producto_id
       from factura_compra_items i
       join facturas_compra f on f.id = i.factura_compra_id
      where f.proveedor_id = p_proveedor_id
   );

  get diagnostics v_afectados = row_count;
  return v_afectados;
end;
$$;

-- ── Permisos ──────────────────────────────────────────────────────────────────
-- Las funciones son SECURITY INVOKER: RLS sigue decidiendo qué puede hacer cada
-- rol. Acá sólo se habilita a los usuarios logueados a invocarlas.

grant execute on function crear_factura_venta(uuid, date, text, numeric, numeric, numeric, text, jsonb, text) to authenticated;
grant execute on function crear_factura_compra(uuid, date, text, numeric, numeric, numeric, text, jsonb, text) to authenticated;
grant execute on function crear_presupuesto(uuid, uuid, text, date, int, text, jsonb, text) to authenticated;
grant execute on function convertir_presupuesto_en_factura(uuid, text) to authenticated;
grant execute on function registrar_pago(text, uuid, uuid, numeric, text, date, text, jsonb) to authenticated;
grant execute on function registrar_cobro_venta(uuid, numeric, text, date, text) to authenticated;
grant execute on function crear_remito(uuid, date, uuid, text, text) to authenticated;
grant execute on function recalcular_precios_proveedor(uuid) to authenticated;
