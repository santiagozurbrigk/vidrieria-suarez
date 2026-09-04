-- Índices para los accesos que hace la aplicación.
--
-- Todos los listados ordenan por (fecha desc, created_at desc) y pide una
-- página; sin índice eso obliga a un sort completo de la tabla en cada carga.
-- Los índices parciales sobre saldo_pendiente sirven a las pantallas de Pagos
-- y a las tarjetas de "por cobrar" del inicio.

create index if not exists facturas_venta_fecha_idx
  on facturas_venta (fecha desc, created_at desc);

create index if not exists facturas_venta_cliente_idx
  on facturas_venta (cliente_id);

create index if not exists facturas_venta_pendientes_idx
  on facturas_venta (cliente_id, fecha)
  where saldo_pendiente > 0;

create index if not exists facturas_compra_fecha_idx
  on facturas_compra (fecha desc, created_at desc);

create index if not exists facturas_compra_proveedor_idx
  on facturas_compra (proveedor_id);

create index if not exists facturas_compra_pendientes_idx
  on facturas_compra (proveedor_id, fecha)
  where saldo_pendiente > 0;

create index if not exists pagos_fecha_idx
  on pagos (fecha desc, created_at desc);

create index if not exists movimientos_caja_fecha_idx
  on movimientos_caja (fecha desc, created_at desc);

create index if not exists gastos_fecha_idx
  on gastos (fecha desc, created_at desc);

create index if not exists remitos_fecha_idx
  on remitos (fecha desc, created_at desc);

create index if not exists presupuestos_fecha_idx
  on presupuestos (fecha desc, created_at desc);

create index if not exists presupuestos_estado_idx
  on presupuestos (estado);

-- Ítems: siempre se leen por su cabecera.
create index if not exists factura_venta_items_factura_idx
  on factura_venta_items (factura_venta_id);

create index if not exists factura_compra_items_factura_idx
  on factura_compra_items (factura_compra_id);

create index if not exists factura_compra_items_producto_idx
  on factura_compra_items (producto_id);

create index if not exists presupuesto_items_presupuesto_idx
  on presupuesto_items (presupuesto_id);

create index if not exists pago_facturas_pago_idx
  on pago_facturas (pago_id);

create index if not exists movimientos_stock_producto_idx
  on movimientos_stock (producto_id, fecha desc);
