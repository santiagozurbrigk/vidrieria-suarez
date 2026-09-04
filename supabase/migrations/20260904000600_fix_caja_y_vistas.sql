-- Dos problemas que sólo se ven mirando el esquema real, no el código.

-- ── 1. Editar o eliminar un gasto estaba roto ────────────────────────────────
--
-- `movimientos_caja` tiene RLS habilitado pero SÓLO dos políticas: SELECT para
-- admin/vendedor e INSERT para admin. No hay política de UPDATE ni de DELETE,
-- así que PostgreSQL las rechaza para todos los roles, incluido el admin.
--
-- Consecuencias, ambas silenciosas:
--   * `editarGasto` actualizaba el gasto pero su UPDATE sobre el movimiento de
--     caja afectaba 0 filas: la caja seguía mostrando el importe viejo.
--   * `eliminarGasto` intentaba borrar primero el movimiento (0 filas) y después
--     el gasto, que fallaba por la foreign key `fk_caja_gasto`. Borrar un gasto
--     era imposible.
--
-- El movimiento de caja lo crea un trigger a partir del gasto, así que su ciclo
-- de vida debe seguir al del gasto: se pasa la FK a ON DELETE CASCADE y se
-- agregan las políticas que faltaban.

alter table movimientos_caja drop constraint if exists fk_caja_gasto;
alter table movimientos_caja
  add constraint fk_caja_gasto
  foreign key (gasto_id) references gastos(id) on delete cascade;

-- Mismo criterio para los pagos: el movimiento de caja es un derivado del pago.
alter table movimientos_caja drop constraint if exists fk_caja_pago;
alter table movimientos_caja
  add constraint fk_caja_pago
  foreign key (pago_id) references pagos(id) on delete cascade;

drop policy if exists "admin_update_caja" on movimientos_caja;
create policy "admin_update_caja"
  on movimientos_caja for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin_delete_caja" on movimientos_caja;
create policy "admin_delete_caja"
  on movimientos_caja for delete
  using (public.is_admin());

-- ── 2. Las vistas existentes salteaban RLS ───────────────────────────────────
--
-- `v_saldo_caja` y `v_productos_bajo_minimo` se crearon sin `security_invoker`,
-- así que corrían con los permisos de su dueño (postgres) e ignoraban por
-- completo las políticas de las tablas de abajo. En concreto: `movimientos_caja`
-- sólo deja ver la caja a ADMIN y VENDEDOR, pero cualquier usuario autenticado
-- —incluido un rol DEPOSITO— podía leer el saldo entero consultando la vista.
--
-- Verificado en la base: ninguna de las dos tenía reloptions.

alter view v_saldo_caja            set (security_invoker = true);
alter view v_productos_bajo_minimo set (security_invoker = true);

-- Nota: a partir de acá un usuario DEPOSITO ya no ve el saldo de caja en la
-- pantalla de inicio (la consulta devuelve cero filas y la tarjeta muestra $0),
-- que es el comportamiento que describe la matriz de permisos del documento
-- base. `v_productos_bajo_minimo` no cambia para nadie, porque `productos`
-- deja leer a cualquier usuario autenticado.
