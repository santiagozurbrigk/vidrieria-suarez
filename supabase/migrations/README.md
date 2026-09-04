# Migraciones

El esquema de la base es la fuente de verdad del sistema y vive acá, versionado.

**Estado: aplicado.** Las 16 migraciones de esta carpeta están aplicadas en el
proyecto `xavpyzyhphcjduycmyuy`. Las ocho primeras son el esquema original, que
hasta ahora sólo existía en el proyecto hosteado y se trajo al repo; las demás
son las correcciones de la auditoría.

## Trabajar contra el proyecto

```bash
npx supabase link --project-ref xavpyzyhphcjduycmyuy

npx supabase db push        # aplicar migraciones pendientes
npx supabase migration list # comparar local vs. remoto

# Regenerar los tipos después de cada cambio de esquema
npx supabase gen types typescript --project-id xavpyzyhphcjduycmyuy > lib/supabase/types.ts
```

`lib/supabase/types.ts` es **generado**: no editarlo a mano. Lo único agregado
al final del archivo son los alias de conveniencia (`Producto`, `FacturaVenta`,
`ResumenVentas`, …) que usa la app.

## Qué hay acá

### Esquema original (traído del proyecto)

| Archivo | Contenido |
|---|---|
| `20260821183919_001_base_schema.sql` | Enums, `profiles`, helpers de rol, `audit_log`, RLS base |
| `20260821183940_002_stock.sql` | `productos`, `movimientos_stock`, trigger de stock |
| `20260821184339_003_proveedores_compras.sql` | Proveedores, facturas de compra, costeo automático |
| `20260821184402_004_clientes_ventas.sql` | Clientes, facturas de venta, remitos, salida de stock |
| `20260821184425_005_arquitectos_presupuestos.sql` | Arquitectos, presupuestos, total automático |
| `20260821184507_006_caja_gastos.sql` | Caja, cierres, categorías y gastos |
| `20260821184553_007_pagos.sql` | Pagos, imputaciones, saldos de factura |
| `20260822184610_margen_ganancia_por_proveedor.sql` | Margen por proveedor en el costeo |

### Correcciones

| Archivo | Qué hace |
|---|---|
| `20260904000100_numeracion_comprobantes.sql` | Numeración correlativa y atómica + índices únicos |
| `20260904000200_rpc_transaccionales.sql` | Primera versión de las RPC transaccionales |
| `20260904000300_normalizar_datos.sql` | Strings vacíos históricos a `NULL` |
| `20260904000400_indices.sql` | Índices para listados por fecha y saldos pendientes |
| `20260904000500_vistas_resumen.sql` | Vistas con los totales por módulo |
| `20260904000600_fix_caja_y_vistas.sql` | Arregla editar/eliminar gastos y el bypass de RLS en las vistas viejas |
| `20260904000700_endurecer_funciones.sql` | `search_path` fijo y permisos mínimos en las funciones |
| `20260904000800_firmas_rpc.sql` | Reordena los parámetros de las RPC (los opcionales al final) |

## Las decisiones de fondo

### Por qué RPCs

Registrar una factura toca dos tablas: la cabecera y los ítems. Hecho desde la
app son dos requests separados, y si el segundo falla —típicamente porque el
trigger de stock rechaza la venta por faltante— la cabecera ya quedó escrita. El
código lo compensaba con un `delete` manual, que a su vez puede fallar. Peor: al
cargar una factura de compra con productos nuevos, los productos se creaban
antes que la factura, así que un fallo posterior los dejaba huérfanos en el
catálogo.

Cada función RPC corre dentro de una sola transacción: si algo falla en el
medio, incluido cualquier trigger, se revierte todo.

**Todas son `SECURITY INVOKER`** (el default de PostgreSQL): corren con los
permisos de quien llama, así que RLS se sigue aplicando igual que antes. La
única excepción es `siguiente_numero()`, que es `SECURITY DEFINER` porque
necesita escribir en la tabla de contadores; no lee ni devuelve datos de negocio.

### Por qué los parámetros opcionales van al final

`supabase gen types` marca un parámetro como opcional en TypeScript sólo si
tiene `DEFAULT` en SQL, y declara al resto como no-nulo aunque PostgreSQL acepte
`NULL` en cualquiera. Con las firmas originales no se podía expresar en
TypeScript un presupuesto sin cliente. Como PostgreSQL exige que todo parámetro
posterior a uno con `DEFAULT` también lo tenga, hubo que reordenarlos
(`20260904000800`). Las llamadas van por nombre, así que el orden no afecta a
ningún llamador.

### Por qué vistas de resumen

Las tarjetas de "Total facturado", "Por cobrar", etc. sumaban el array que la
página había traído. Ahora que los listados tienen un `.limit()` explícito, eso
mostraría el total de la página en lugar del total real, así que los importes se
calculan en la base (`v_resumen_*`).

Todas las vistas llevan `security_invoker = true`. Sin esa opción una vista
corre con los permisos de su dueño y **saltea las políticas RLS** de las tablas
de abajo — que era exactamente el caso de `v_saldo_caja` y
`v_productos_bajo_minimo`, creadas antes de que el repo versionara el esquema:
cualquier usuario autenticado podía leer el saldo de caja completo aunque su rol
no tuviera permiso sobre `movimientos_caja`. Corregido en `20260904000600`.

## Pendiente, fuera de SQL

El linter de Supabase marca **Leaked Password Protection Disabled**. Es un
interruptor del panel (Authentication → Policies), no algo que se arregle con
una migración. Conviene activarlo: valida las contraseñas nuevas contra
HaveIBeenPwned.
