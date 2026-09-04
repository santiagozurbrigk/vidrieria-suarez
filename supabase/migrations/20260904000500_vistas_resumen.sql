-- Totales calculados en la base, no en el navegador.
--
-- Las tarjetas de resumen de cada módulo sumaban el array que la página había
-- traído. Mientras se traían todas las filas eso daba bien, pero cualquier
-- límite (el tope de filas de PostgREST, o el .limit() que ahora tienen los
-- listados) las volvía silenciosamente falsas: mostraban el total de la página
-- cargada como si fuera el total del negocio.
--
-- Estas vistas devuelven una sola fila con los totales reales.
--
-- `security_invoker = true` es obligatorio: sin eso la vista se ejecuta con los
-- permisos de su dueño y saltea las políticas RLS de las tablas subyacentes,
-- que es exactamente lo que no queremos.

create or replace view v_resumen_ventas
with (security_invoker = true) as
select
  count(*)                                                  as cantidad,
  coalesce(sum(total), 0)                                   as total_facturado,
  coalesce(sum(saldo_pendiente), 0)                         as total_pendiente,
  count(*) filter (where estado = 'PENDIENTE')              as pendientes,
  count(*) filter (where estado = 'PARCIAL')                as parciales,
  count(*) filter (where estado = 'PAGADA')                 as pagadas
from facturas_venta;

create or replace view v_resumen_compras
with (security_invoker = true) as
select
  count(*)                                                  as cantidad,
  coalesce(sum(total), 0)                                   as total_facturado,
  coalesce(sum(saldo_pendiente), 0)                         as total_pendiente,
  count(*) filter (where estado = 'PENDIENTE')              as pendientes,
  count(*) filter (where estado = 'PARCIAL')                as parciales,
  count(*) filter (where estado = 'PAGADA')                 as pagadas
from facturas_compra;

create or replace view v_resumen_pagos
with (security_invoker = true) as
select
  count(*)                                                              as cantidad,
  coalesce(sum(monto) filter (where tipo = 'COBRO_CLIENTE'), 0)         as total_cobros,
  coalesce(sum(monto) filter (where tipo = 'PAGO_PROVEEDOR'), 0)        as total_pagos
from pagos;

create or replace view v_resumen_presupuestos
with (security_invoker = true) as
select
  count(*)                                          as cantidad,
  coalesce(sum(total), 0)                           as total,
  count(*) filter (where estado = 'BORRADOR')       as borradores,
  count(*) filter (where estado = 'ENVIADO')        as enviados,
  count(*) filter (where estado = 'APROBADO')       as aprobados,
  count(*) filter (where estado = 'RECHAZADO')      as rechazados,
  count(*) filter (where estado = 'CONVERTIDO')     as convertidos
from presupuestos;

create or replace view v_resumen_remitos
with (security_invoker = true) as
select
  count(*)                                          as cantidad,
  count(*) filter (where estado = 'PENDIENTE')      as pendientes,
  count(*) filter (where estado = 'ENTREGADO')      as entregados,
  count(*) filter (where estado = 'CANCELADO')      as cancelados
from remitos;

grant select on v_resumen_ventas, v_resumen_compras, v_resumen_pagos,
                v_resumen_presupuestos, v_resumen_remitos
  to authenticated;

-- ── Nota sobre las vistas que ya existían ─────────────────────────────────────
--
-- `v_saldo_caja` y `v_productos_bajo_minimo` se crearon antes de que este repo
-- versionara el esquema. Conviene verificar que también tengan
-- security_invoker activado:
--
--   select c.relname, c.reloptions
--     from pg_class c
--     join pg_namespace n on n.oid = c.relnamespace
--    where c.relkind = 'v' and n.nspname = 'public';
--
-- Si `reloptions` no incluye `security_invoker=true`, corregilas con:
--
--   alter view v_saldo_caja           set (security_invoker = true);
--   alter view v_productos_bajo_minimo set (security_invoker = true);
--
-- Sin eso, cualquier usuario logueado ve el saldo de caja y el stock completos
-- aunque su rol no tenga permiso sobre esas tablas.

-- ── Gastos por período ────────────────────────────────────────────────────────
--
-- El módulo de Gastos traía las últimas 200 filas y filtraba por mes en el
-- navegador: cualquier mes anterior a esas 200 filas aparecía vacío, y el
-- "total del período" sumaba sólo lo que había entrado en esa ventana. Ahora
-- el mes se filtra en el servidor y estos totales salen de la base.

create or replace view v_gastos_por_mes
with (security_invoker = true) as
select
  to_char(fecha, 'YYYY-MM')  as mes,
  count(*)                   as cantidad,
  coalesce(sum(monto), 0)    as total
from gastos
group by 1;

create or replace view v_gastos_por_categoria_mes
with (security_invoker = true) as
select
  to_char(g.fecha, 'YYYY-MM')            as mes,
  g.categoria_id                         as categoria_id,
  coalesce(c.nombre, 'Sin categoría')    as categoria,
  count(*)                               as cantidad,
  coalesce(sum(g.monto), 0)              as total
from gastos g
left join categorias_gasto c on c.id = g.categoria_id
group by 1, 2, 3;

grant select on v_gastos_por_mes, v_gastos_por_categoria_mes to authenticated;
