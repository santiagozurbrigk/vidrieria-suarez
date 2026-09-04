# Migraciones

El esquema de la base es la fuente de verdad del sistema y vive acá, versionado.

> **Estado actual:** el esquema original (tablas, triggers, vistas y políticas
> RLS descritos en `documento-base-desarrollo.md` §5, §6 y §8) fue creado
> directamente en el proyecto de Supabase y **todavía no está en el repo**.
> Antes de aplicar las migraciones de esta carpeta hay que traerlo como
> baseline — ver "Paso 0".

## Paso 0 — Traer el esquema existente (una sola vez)

```bash
npx supabase link --project-ref <project-ref>
npx supabase db pull        # crea la migración baseline con el esquema actual
git add supabase/migrations && git commit -m "chore: baseline del esquema"
```

Esto genera un archivo con timestamp *anterior* a los de esta carpeta, así que
el orden queda correcto: primero el esquema existente, después estas migraciones.

## Paso 1 — Revisar los duplicados antes de aplicar

`20260904000100_numeracion_comprobantes.sql` crea índices únicos sobre los
números de comprobante. Si ya hay duplicados cargados a mano, la migración
falla (a propósito). Para verlos antes:

```sql
select numero, count(*) from facturas_venta  group by numero having count(*) > 1;
select proveedor_id, numero, count(*) from facturas_compra group by 1, 2 having count(*) > 1;
select numero, count(*) from presupuestos    group by numero having count(*) > 1;
select numero, count(*) from remitos         group by numero having count(*) > 1;
```

Corregí los duplicados y recién después aplicá.

## Paso 2 — Aplicar

```bash
npx supabase db push
```

## Paso 3 — Regenerar los tipos

```bash
npx supabase gen types typescript --project-id <project-ref> > lib/supabase/types.ts
```

`lib/supabase/types.ts` está mantenido a mano hoy. Después de aplicar estas
migraciones **hay que regenerarlo con el comando de arriba**, porque agregan
funciones RPC nuevas que la app llama por nombre y que TypeScript necesita
conocer. Mientras tanto, el archivo declara esas funciones a mano en la sección
`Functions` para que el proyecto compile.

## Qué agrega cada migración

| Archivo | Qué hace |
|---|---|
| `20260904000100_numeracion_comprobantes.sql` | Numeración automática y correlativa de comprobantes + índices únicos |
| `20260904000200_rpc_transaccionales.sql` | Funciones RPC que escriben cabecera + ítems en una sola transacción |
| `20260904000300_normalizar_datos.sql` | Convierte los strings vacíos históricos en `NULL` |
| `20260904000400_indices.sql` | Índices para los listados ordenados por fecha y los saldos pendientes |
| `20260904000500_vistas_resumen.sql` | Vistas con los totales por módulo, para que las tarjetas de resumen no dependan de las filas cargadas |

## Por qué RPCs

Registrar una factura toca dos tablas: la cabecera y los ítems. Hecho desde la
app son dos requests separados, y si el segundo falla (por ejemplo, el trigger
de stock rechaza la venta por faltante) la cabecera ya quedó escrita. El código
lo compensaba con un `delete` manual, que a su vez puede fallar.

Cada función RPC corre dentro de una única transacción de PostgreSQL: si algo
falla en el medio — incluido cualquier trigger — se revierte todo automáticamente.

**Todas las funciones son `SECURITY INVOKER`** (el default de PostgreSQL), así
que corren con los permisos del usuario que llama y **las políticas RLS se
siguen aplicando**. La única excepción es `siguiente_numero()`, que es
`SECURITY DEFINER` porque necesita escribir en la tabla de contadores; no lee
ni devuelve datos de negocio.

## Por qué vistas de resumen

Las tarjetas de "Total facturado", "Por cobrar", etc. sumaban el array que la
página había traído. Ahora que los listados tienen un `.limit()` explícito, eso
mostraría el total de la página en lugar del total real, así que los importes
se calculan en la base (`v_resumen_*`).

Todas las vistas nuevas se crean con `security_invoker = true`: sin esa opción
una vista corre con los permisos de su dueño y **saltea las políticas RLS** de
las tablas de abajo. Vale la pena revisar que `v_saldo_caja` y
`v_productos_bajo_minimo`, que son anteriores a este repo, también la tengan —
la consulta para verificarlo está comentada al final del archivo de vistas.
