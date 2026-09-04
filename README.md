# Vidriería Suárez — Sistema de gestión interno

Aplicación web interna para gestionar stock, compras, ventas, presupuestos,
cuenta corriente, caja y gastos.

El diseño funcional completo está en [`documento-base-desarrollo.md`](./documento-base-desarrollo.md).

## Stack

| Pieza | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Lenguaje | TypeScript (`strict`) |
| Estilos | Tailwind CSS 3 |
| Base de datos y auth | Supabase (PostgreSQL + Supabase Auth) |
| Lógica de negocio crítica | Funciones y triggers de PostgreSQL |
| Escaneo de facturas | Anthropic Claude (visión + PDF) |
| Exportación | SheetJS (Excel), `window.print()` (PDF) |

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # completar con los valores reales
npm run dev
```

Variables requeridas (ver [`.env.example`](./.env.example)):

- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` — obligatorias.
- `ANTHROPIC_KEY` — obligatoria sólo para el escaneo de facturas con IA.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (flat config, `eslint.config.mjs`) |

CI corre los tres últimos en cada push y pull request
(`.github/workflows/ci.yml`).

## Estructura

```
app/
  (auth)/login          Pantalla de login
  (dashboard)/          13 módulos con sidebar, protegidos por sesión
  (print)/imprimir/     Documentos imprimibles (factura, presupuesto, remito)
components/             UI compartida y layout
lib/
  actions/              Server Actions ('use server') — toda la escritura
  supabase/             Clientes de Supabase (server/browser) y tipos
  fechas.ts             Helpers de fecha en zona horaria local
  exportar.ts           Exportación a Excel
supabase/migrations/    Esquema, funciones, triggers y políticas RLS
proxy.ts                Refresco de sesión y redirección (ex middleware.ts)
```

### Cómo se escribe y se lee

- **Lectura:** los `page.tsx` son Server Components; consultan Supabase
  directamente y pasan los datos ya resueltos a un componente cliente.
- **Escritura:** siempre a través de una Server Action en `lib/actions/`,
  validada con Zod.
- **Reglas de negocio:** viven en PostgreSQL, no en TypeScript. El costeo
  automático, el descuento de stock, el saldo de las facturas y los
  movimientos de caja los resuelven triggers. Las operaciones que tocan varias
  tablas a la vez se hacen con funciones RPC para que sean atómicas —
  ver `supabase/migrations/`.

## Base de datos

El esquema es la fuente de verdad y vive versionado en `supabase/migrations/`.

Para trabajar contra el proyecto real:

```bash
npx supabase link --project-ref <project-ref>

# Traer el esquema actual del proyecto como migración baseline
npx supabase db pull

# Aplicar migraciones pendientes
npx supabase db push

# Regenerar los tipos de TypeScript desde el esquema
npx supabase gen types typescript --project-id <project-ref> > lib/supabase/types.ts
```

> `lib/supabase/types.ts` debe regenerarse con el comando de arriba después de
> cada cambio de esquema. No editarlo a mano.

## Permisos

Los tres roles (`ADMIN`, `VENDEDOR`, `DEPOSITO`) viven en `profiles.rol` y se
aplican con Row Level Security en cada tabla. La UI oculta acciones según el
rol, pero **eso es sólo conveniencia**: la restricción real la hace PostgreSQL.
