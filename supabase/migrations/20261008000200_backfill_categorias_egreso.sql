-- ============================================================
-- Rellenar la categoría de los egresos anteriores a Caja
-- ============================================================
--
-- `categoria_egreso` se agregó como columna nueva, así que los gastos cargados
-- antes de esa migración la tienen en null y la pantalla de Gastos los muestra
-- todos como "Sin categoría". Su categoría real sigue en `gastos.categoria_id`,
-- que apunta a la tabla vieja `categorias_gasto`.
--
-- Se traduce esa categoría al enum nuevo. Las ocho categorías viejas no mapean
-- una a una contra las seis que pidió el negocio, así que lo que no tiene
-- equivalente claro queda en VARIOS y se puede recategorizar desde Gastos.

create or replace function categoria_egreso_desde_nombre(p_nombre text)
returns categoria_egreso
language sql
immutable
set search_path = public
as $$
  select case
    when p_nombre is null                            then 'VARIOS'
    when p_nombre ilike '%servicio%'                 then 'SERVICIO'
    when p_nombre ilike '%combustible%'              then 'COMBUSTIBLE'
    when p_nombre ilike '%transporte%'
      or p_nombre ilike '%flete%'                    then 'COMBUSTIBLE'
    when p_nombre ilike '%vehic%' or p_nombre ilike '%veh%culo%' then 'VEHICULOS'
    when p_nombre ilike '%retiro%'                   then 'RETIRO'
    when p_nombre ilike '%proveedor%'                then 'PROVEEDOR'
    else 'VARIOS'
  end::categoria_egreso
$$;

-- ── Los gastos ───────────────────────────────────────────────────────────────
update gastos g
   set categoria_egreso = categoria_egreso_desde_nombre(cg.nombre)
  from categorias_gasto cg
 where g.categoria_id = cg.id
   and g.categoria_egreso is null;

-- Un gasto sin categoria_id tampoco tiene de dónde sacarla.
update gastos
   set categoria_egreso = 'VARIOS'
 where categoria_egreso is null;

-- ── Los movimientos de caja ──────────────────────────────────────────────────
-- El trigger copia la categoría del gasto, pero sólo al crearlo: los que ya
-- existían hay que emparejarlos a mano.
update movimientos_caja m
   set categoria_egreso = g.categoria_egreso
  from gastos g
 where m.gasto_id = g.id
   and m.categoria_egreso is null;

-- Un pago a proveedor es, por definición, de categoría proveedor.
update movimientos_caja m
   set categoria_egreso = 'PROVEEDOR',
       proveedor_id     = coalesce(m.proveedor_id, p.proveedor_id)
  from pagos p
 where m.pago_id = p.id
   and p.tipo = 'PAGO_PROVEEDOR'
   and m.categoria_egreso is null;

-- Egresos cargados directo en caja, sin gasto ni pago detrás.
update movimientos_caja
   set categoria_egreso = 'VARIOS'
 where tipo = 'EGRESO'
   and categoria_egreso is null;

drop function if exists categoria_egreso_desde_nombre(text);
