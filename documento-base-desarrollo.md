# Documento Base de Desarrollo
## Sistema de Gestión Interna — Vidriería

**Versión:** 2.0 — arquitectura basada en Vercel + Supabase (reemplaza la versión 1.0, basada en VPS propio con Docker).
**Estado:** Documento vivo — se actualiza a medida que avanza el desarrollo.
**Audiencia:** equipo de desarrollo (uso técnico interno).

> **Por qué cambió de versión:** la v1.0 proponía un VPS propio (Docker Compose + NestJS + PostgreSQL autogestionado). Se decidió pasar a Vercel + Supabase para reducir la complejidad operativa — no hay servidor que administrar, ni Docker, ni backups manuales, ni SSL a mano. A cambio, el costo mensual es mayor (~USD 45 vs ~USD 8) y algunas piezas que antes construíamos nosotros (autenticación, backups, hosting de archivos) ahora las provee la plataforma. Esa decisión ya está tomada; este documento explica cómo se traduce en la práctica.

---

## 1. Introducción

Este documento es la referencia técnica única para construir el sistema. Se apoya en dos documentos ya acordados con el cliente:
- **Propuesta funcional** (los 8 módulos presentados).
- **Presupuesto** (alcance, etapas, condiciones comerciales).

Acá se define **cómo se construye**, no cuánto cuesta ni cuándo se cobra.

**Antes de seguir, un mapa mental de qué es cada pieza**, porque son conceptos nuevos si nunca se trabajó con esta arquitectura:

- **Next.js**: el framework con el que se escribe toda la aplicación (páginas que ve el usuario + la lógica del servidor). Es "React" pero con superpoderes de servidor incluidos — no hace falta un backend aparte como NestJS.
- **Vercel**: la plataforma donde se aloja la aplicación Next.js. Uno hace `git push` y Vercel construye y publica el sitio solo. No hay servidor que prender, apagar ni actualizar.
- **Supabase**: una base de datos PostgreSQL gestionada, con extras ya incluidos: login de usuarios (Auth), almacenamiento de archivos (Storage) y una forma de exponer la base de datos de forma segura sin escribir un backend tradicional.

La idea central de esta arquitectura es: **Next.js reemplaza al backend NestJS que planeábamos, y Supabase reemplaza tanto al PostgreSQL autogestionado como a buena parte de la lógica de autenticación y archivos que íbamos a construir a mano.**

---

## 2. Alcance funcional — resumen por módulo

(Sin cambios respecto de la propuesta: se mantienen los 8 módulos. Se repite acá para que este documento sea autocontenido.)

### 2.1 Stock
ABM de productos (vidrio, aluminio, accesorio, insumo) con unidad de medida (unidad, m², metro lineal). Movimientos de entrada/salida/ajuste. El stock nunca se edita a mano — siempre se deriva de movimientos. Alerta cuando el stock cae por debajo del mínimo.

### 2.2 Proveedores
ABM de proveedores (razón social, CUIT, condición IVA, contacto, alias CBU). Facturas de compra con ítems. Adjunto del comprobante real. Cuenta corriente calculada.

### 2.3 Lista de Precios (costeo automático)
Al cargar una factura de compra, el costo del producto se actualiza y el precio de venta se recalcula según el margen configurado (`precioVenta = costo × (1 + margen/100)`). Es la pieza de lógica de negocio más sensible del sistema — ver sección 6.

### 2.4 Clientes
ABM de clientes. Facturas y remitos de venta internos, con comprobante adjunto. Cuenta corriente calculada.

### 2.5 Arquitectos
ABM de arquitectos/estudios, cada uno con sus clientes/obras asociados. Presupuestos con los precios vigentes al momento de crearse (no en vivo). Un presupuesto no toca stock ni caja hasta convertirse en factura de venta real.

### 2.6 Pagos
Cobros a clientes y pagos a proveedores. Un pago puede imputarse a una o varias facturas, y puede ser parcial. Genera automáticamente un movimiento de caja.

### 2.7 Caja
Registro de todo movimiento de dinero, con origen trazable. Cierre diario con arqueo (comparación contra efectivo real).

### 2.8 Gastos
Categorías configurables de gasto. Cada gasto genera un movimiento de caja. Resumen mensual por categoría para el cierre de mes.

---

## 3. Requerimientos no funcionales

| Atributo | Definición | Cómo lo resuelve esta arquitectura |
|---|---|---|
| Seguridad | Login obligatorio, contraseñas nunca en texto plano, HTTPS, control de acceso por rol | Supabase Auth maneja login y hash de contraseñas; Vercel da HTTPS automático; el control por rol se implementa con Row Level Security (RLS) — ver sección 8 |
| Disponibilidad | Accesible 24/7 | Ambas plataformas son gestionadas: no depende de un servidor que alguien tenga que mantener encendido |
| Rendimiento | Respuestas rápidas, cálculos reflejados al instante | Los cálculos críticos viven en la base de datos (triggers), no en un paso intermedio que pueda demorar |
| Escalabilidad | Decenas de usuarios concurrentes | Ampliamente cubierto por los planes pagos de ambas plataformas |
| Usabilidad | Responsive, apto para personal sin perfil técnico | Next.js + diseño mobile-first |
| Mantenibilidad | Código modular, tipado | TypeScript de punta a punta, tipos generados automáticamente desde la base |
| Recuperación ante fallos | Backups | Supabase hace backups automáticos diarios en el plan Pro (Point-in-Time Recovery disponible) — no hay que configurar nada a mano |

---

## 4. Arquitectura técnica

### 4.1 Stack definido

| Capa | Tecnología | Rol |
|---|---|---|
| Aplicación (frontend + servidor) | **Next.js 14+ (App Router) + TypeScript** | Reemplaza tanto al frontend React como al backend NestJS de la v1.0. Las páginas y la lógica de servidor viven en el mismo proyecto. |
| Hosting | **Vercel** | Aloja la aplicación Next.js. Cada `git push` genera un despliegue nuevo automáticamente. |
| Base de datos | **Supabase (PostgreSQL gestionado)** | Guarda todos los datos. Se administra desde el panel de Supabase, sin acceso por terminal a un servidor propio. |
| Autenticación | **Supabase Auth** | Login por email/contraseña, manejo de sesión, recuperación de contraseña — ya viene resuelto, no se construye a mano. |
| Archivos adjuntos | **Supabase Storage** | Buckets para las imágenes/PDF de facturas escaneadas. |
| Acceso a datos | **Supabase Client (`@supabase/supabase-js`)** + tipos generados automáticamente | Reemplaza a Prisma; los tipos de TypeScript se generan desde el esquema real de la base con un comando del CLI de Supabase. |
| Lógica de negocio crítica | **Funciones y triggers de PostgreSQL** (ver sección 6) | Donde antes había un "service" de NestJS, ahora la regla vive directamente en la base de datos, para garantizar que se cumpla sin importar desde dónde se escriba. |
| Estilos | TailwindCSS | Igual que en la v1.0 |
| Permisos por rol | **Row Level Security (RLS) de PostgreSQL** | Reemplaza a los `Guards` de NestJS — el propio motor de base de datos decide qué puede ver o modificar cada usuario. |

### 4.2 Cómo se relacionan las piezas

```
Usuario (navegador, PC o celular)
        │  HTTPS
        ▼
Next.js en Vercel
   ├─ Páginas y componentes (lo que se ve)
   ├─ Server Actions / Route Handlers (lo que antes era "el backend")
   └─ Cliente de Supabase (para leer/escribir datos)
        │
        ▼
Supabase
   ├─ Auth        → quién es el usuario
   ├─ PostgreSQL  → todos los datos + reglas de negocio (triggers)
   ├─ Storage     → archivos adjuntos
   └─ RLS         → qué puede hacer cada usuario según su rol
```

La diferencia clave con la v1.0: **no hay un servidor intermedio que nosotros programemos como una caja separada.** Next.js corre tanto la parte visual como la parte de servidor en el mismo proyecto, y buena parte de lo que antes era "lógica de backend" ahora vive directamente en la base de datos (Supabase) a través de funciones y políticas de seguridad.

### 4.3 Estructura de carpetas propuesta

```
/app
  /(auth)
    /login
  /(dashboard)
    /stock
    /proveedores
    /precios
    /clientes
    /arquitectos
    /pagos
    /caja
    /gastos
  /api                    → Route Handlers (si se necesita un endpoint HTTP puntual)
/components               → componentes compartidos (tabla, modal, input)
/lib
  /supabase
    client.ts             → cliente de Supabase para el navegador
    server.ts             → cliente de Supabase para Server Components/Actions
    types.ts              → tipos generados automáticamente (supabase gen types)
  /actions                → Server Actions, una carpeta por módulo
/supabase
  /migrations             → archivos SQL versionados (esquema, triggers, políticas RLS)
  config.toml
```

---

## 5. Modelo de datos

El esquema se define como **migraciones SQL versionadas** dentro de `/supabase/migrations`, gestionadas con el CLI de Supabase (`supabase migration new nombre`). Esto reemplaza a `schema.prisma` de la v1.0 — el SQL es la fuente de verdad.

```sql
-- Roles de usuario. Se guardan en una tabla propia vinculada a auth.users
-- (la tabla de usuarios que ya trae Supabase Auth).
create type rol_usuario as enum ('ADMIN', 'VENDEDOR', 'DEPOSITO');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  rol rol_usuario not null default 'VENDEDOR',
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create type categoria_producto as enum ('VIDRIO', 'ALUMINIO', 'ACCESORIO', 'INSUMO');
create type unidad_medida as enum ('UNIDAD', 'M2', 'ML');

create table productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria categoria_producto not null,
  unidad_medida unidad_medida not null,
  costo_actual numeric(12,2) not null default 0,
  margen_ganancia numeric(5,2) not null default 0,     -- porcentaje
  precio_venta numeric(12,2) not null default 0,        -- calculado, no editar a mano
  stock_actual numeric(12,3) not null default 0,
  stock_minimo numeric(12,3) not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type tipo_movimiento_stock as enum ('ENTRADA', 'SALIDA', 'AJUSTE');

create table movimientos_stock (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id),
  tipo tipo_movimiento_stock not null,
  cantidad numeric(12,3) not null,
  motivo text,
  fecha timestamptz not null default now(),
  factura_compra_id uuid,
  factura_venta_id uuid,
  usuario_id uuid not null references profiles(id)
);

create table proveedores (
  id uuid primary key default gen_random_uuid(),
  razon_social text not null,
  cuit text,
  condicion_iva text,
  contacto text,
  direccion text,
  alias_cbu text,
  activo boolean not null default true
);

create type estado_factura as enum ('PENDIENTE', 'PARCIAL', 'PAGADA');

create table facturas_compra (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references proveedores(id),
  numero text not null,
  fecha date not null,
  tipo_comprobante text,
  total numeric(12,2) not null,
  saldo_pendiente numeric(12,2) not null,
  estado estado_factura not null default 'PENDIENTE',
  archivo_adjunto_path text                              -- ruta dentro del bucket de Supabase Storage
);

create table factura_compra_items (
  id uuid primary key default gen_random_uuid(),
  factura_compra_id uuid not null references facturas_compra(id) on delete cascade,
  producto_id uuid not null references productos(id),
  cantidad numeric(12,3) not null,
  costo_unitario numeric(12,2) not null,                 -- dispara el trigger de costeo
  subtotal numeric(12,2) not null
);

-- ... (clientes, facturas_venta, remitos, arquitectos, presupuestos,
--      pagos, pago_facturas, movimientos_caja, categorias_gasto, gastos)
-- siguen el mismo patrón: tablas planas con tipos explícitos y foreign keys.
-- El detalle completo vive en /supabase/migrations, no se duplica acá para
-- no tener dos fuentes de verdad del esquema.
```

**Decisión de tipos:** todos los montos son `numeric`, nunca `float`/`real` — un float pierde precisión en dinero y con el tiempo genera diferencias de centavos muy difíciles de rastrear en una cuenta corriente. Esto no cambió respecto de la v1.0.

**Tipos en TypeScript:** se generan automáticamente desde este esquema con:
```bash
supabase gen types typescript --project-id <id-del-proyecto> > lib/supabase/types.ts
```
Esto evita mantener a mano una definición de tipos que puede desincronizarse de la base real.

---

## 6. Reglas de negocio críticas — ahora como funciones y triggers de PostgreSQL

Esta es la sección que más cambió respecto de la v1.0. Antes estas reglas vivían en "services" de NestJS, escritos en TypeScript. Ahora **viven directamente en la base de datos**, como funciones en PL/pgSQL disparadas por triggers. Esto tiene una ventaja real: la regla se cumple pase lo que pase, sin importar si el que escribe en la tabla es el sitio web, un script de carga inicial, o alguien usando el panel de Supabase directamente.

### 6.1 Costeo automático
```sql
create or replace function fn_actualizar_costo_producto()
returns trigger as $$
begin
  update productos
  set costo_actual = new.costo_unitario,
      precio_venta = new.costo_unitario * (1 + margen_ganancia / 100),
      updated_at = now()
  where id = new.producto_id;
  return new;
end;
$$ language plpgsql;

create trigger trg_costeo_automatico
after insert on factura_compra_items
for each row execute function fn_actualizar_costo_producto();
```
Al insertarse un ítem de factura de compra, el costo y el precio de venta del producto se actualizan solos, en la misma transacción — no hace falta ningún paso adicional desde la aplicación.

### 6.2 Movimiento de stock por compra y por venta
Trigger equivalente sobre `factura_compra_items` (suma stock, crea `movimientos_stock` tipo `ENTRADA`) y sobre `factura_venta_items` (resta stock, tipo `SALIDA`, con validación de stock suficiente).

### 6.3 Cuenta corriente
El `saldo_pendiente` de una factura se recalcula con un trigger sobre `pago_facturas`: cada vez que se inserta una imputación, se descuenta del saldo y se actualiza el `estado` (`PENDIENTE` / `PARCIAL` / `PAGADA`) según corresponda — nunca se setea a mano desde la aplicación.

### 6.4 Integridad de imputación de pagos
Un *constraint trigger* valida que la suma de `monto_imputado` de todos los `pago_facturas` de un mismo pago nunca supere el `monto` total del pago. Si se intenta violar, la base de datos rechaza la operación directamente (no depende de que el frontend valide bien).

### 6.5 Movimiento de caja automático
Todo `pago` genera un `movimiento_caja` vía trigger (`INGRESO` si es cobro, `EGRESO` si es pago a proveedor). Todo `gasto` genera un `movimiento_caja` tipo `EGRESO`. Un movimiento de caja manual (sin origen) solo se permite para ajustes explícitos.

### 6.6 Presupuestos no impactan stock ni caja
Los `presupuesto_items` copian el precio vigente al momento de crearse (no referencian el precio en vivo), así un cambio de margen posterior no altera presupuestos ya emitidos. Ningún trigger de stock/caja está asociado a la tabla de presupuestos — solo se disparan al convertirse en una factura de venta real.

### 6.7 Alertas de stock mínimo
No es un trigger — es una vista de PostgreSQL:
```sql
create view v_productos_bajo_minimo as
select * from productos where stock_actual <= stock_minimo and activo = true;
```
Se consulta desde el dashboard, sin necesidad de un proceso corriendo en segundo plano.

---

## 7. Cómo se accede a los datos desde la aplicación

No hay una API REST tradicional como en la v1.0. En su lugar:

- **Server Components** de Next.js leen datos directamente con el cliente de Supabase del lado del servidor, en el momento de renderizar la página.
- **Server Actions** manejan las escrituras (crear una factura, registrar un pago, etc.) — son funciones de TypeScript que corren en el servidor de Vercel y llaman a Supabase, sin necesidad de armar un endpoint HTTP a mano para cada operación.
- **Route Handlers** (`/app/api/.../route.ts`) se usan solo cuando hace falta un endpoint HTTP real (por ejemplo, para que un servicio externo llame al sistema) — no para el uso normal de la interfaz.

Ejemplo de una Server Action (registrar un pago):
```typescript
'use server';
import { createServerClient } from '@/lib/supabase/server';

export async function registrarPago(datos: {
  tipo: 'COBRO_CLIENTE' | 'PAGO_PROVEEDOR';
  entidadId: string;
  monto: number;
  medioPago: string;
  imputaciones: { facturaId: string; montoImputado: number }[];
}) {
  const supabase = createServerClient();
  const { data: pago, error } = await supabase
    .from('pagos')
    .insert({ tipo: datos.tipo, entidad_id: datos.entidadId, monto: datos.monto, medio_pago: datos.medioPago })
    .select()
    .single();

  if (error) throw error;

  const imputaciones = datos.imputaciones.map((i) => ({
    pago_id: pago.id,
    factura_venta_id: datos.tipo === 'COBRO_CLIENTE' ? i.facturaId : null,
    factura_compra_id: datos.tipo === 'PAGO_PROVEEDOR' ? i.facturaId : null,
    monto_imputado: i.montoImputado,
  }));

  const { error: errorImputacion } = await supabase.from('pago_facturas').insert(imputaciones);
  if (errorImputacion) throw errorImputacion; // el trigger de integridad (6.4) rechaza si algo no cierra

  return pago;
}
```
Los triggers de la sección 6 se disparan solos al insertarse en `pago_facturas` — la Server Action no necesita saber nada sobre cuenta corriente ni movimientos de caja.

---

## 8. Roles y permisos — con Row Level Security (RLS)

La misma matriz de permisos de siempre, pero implementada distinto: en vez de un `Guard` de NestJS que revisa el rol antes de ejecutar el endpoint, cada tabla de Supabase tiene **políticas RLS** que el propio PostgreSQL aplica automáticamente en cada consulta.

| Módulo | Admin | Vendedor | Depósito |
|---|---|---|---|
| Stock (ver) | ✔ | ✔ | ✔ |
| Stock (editar/mínimos) | ✔ | – | ✔ |
| Proveedores / Facturas de compra | ✔ | – | – |
| Lista de precios (ver) | ✔ | ✔ | ✔ |
| Lista de precios (editar margen) | ✔ | – | – |
| Clientes / Facturas de venta | ✔ | ✔ | – |
| Arquitectos / Presupuestos | ✔ | ✔ | – |
| Pagos | ✔ | ✔ (solo cobros) | – |
| Caja | ✔ | ✔ (ver) | – |
| Gastos | ✔ | – | – |

Ejemplo de política RLS para Proveedores (solo Admin puede ver/editar):
```sql
alter table proveedores enable row level security;

create policy "admin_acceso_total_proveedores"
on proveedores for all
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid() and profiles.rol = 'ADMIN'
  )
);
```

**Importante:** esto es más seguro que el enfoque anterior, no menos — antes, si alguien encontraba la forma de saltarse un Guard de NestJS, accedía igual a la base. Con RLS, la restricción está en el motor de la base de datos: **no hay forma de esquivarla desde ningún cliente**, sea la web, una consulta directa, o un script.

---

## 9. Seguridad

- **Autenticación:** resuelta por Supabase Auth (hash de contraseñas, manejo de sesión, tokens). No se implementa a mano.
- **HTTPS:** automático en Vercel (certificado gestionado, sin Certbot ni configuración manual).
- **Autorización:** RLS en cada tabla (sección 8) — es la defensa principal, no un complemento.
- **Validación de datos:** con `zod` en cada Server Action, antes de tocar la base.
- **Archivos adjuntos:** bucket de Supabase Storage con política de acceso equivalente a las de las tablas (solo usuarios autenticados con el rol correspondiente), tipo de archivo restringido a PDF/JPG/PNG y tamaño máximo 10 MB validado en la Server Action antes de subir.
- **Variables sensibles:** la *service role key* de Supabase (que puede saltarse RLS) nunca se expone al navegador — solo se usa en Server Actions/Route Handlers, nunca en código de cliente.
- **Auditoría:** una tabla simple de log (`usuario_id`, `accion`, `entidad`, `fecha`) para operaciones críticas, poblada desde las mismas Server Actions.

---

## 10. Entorno de desarrollo

**Requisitos:** Node.js 20+, el CLI de Supabase (`npm install -g supabase`), una cuenta de Supabase y una de Vercel.

**Cómo se desarrolla en local:**
```bash
supabase start                 # levanta Postgres + Auth + Storage local (usa Docker por debajo, pero no hay que tocarlo directamente)
supabase migration new nombre  # crear una migración nueva
supabase db reset              # aplicar todas las migraciones desde cero + seed de datos de prueba
npm run dev                    # levanta Next.js en local (localhost:3000)
```

**Variables de entorno (`.env.local`):**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # solo en servidor, nunca en código de cliente
```

**Importante para no mezclar datos:** el desarrollo se hace contra la instancia **local** de Supabase (`supabase start`), no contra el proyecto de producción. Recién cuando algo está probado se aplican las migraciones al proyecto real con `supabase db push`.

**Datos semilla:** un archivo `supabase/seed.sql` con un usuario admin, algunos productos, un proveedor y un cliente de prueba, para no cargar todo a mano cada vez que se resetea la base local.

---

## 11. Testing

- **Funciones de PostgreSQL (sección 6):** se testean con casos SQL directos — insertar datos de prueba y verificar que el trigger dejó el resultado esperado. Es la parte más crítica del sistema y la que menos margen de error tolera.
- **Server Actions:** tests con Vitest, simulando llamadas y verificando que se hayan insertado/actualizado los registros esperados.
- **Frontend:** no crítico en el MVP; se prioriza QA manual guiada por checklist en cada entrega de fase.
- **Checklist de QA por fase:** antes de cada entrega, recorrer manualmente el flujo completo (compra → costeo → stock → venta → cobro → caja) con datos similares a los reales del cliente.

---

## 12. Despliegue e infraestructura

- **Frontend + servidor:** Vercel, conectado al repositorio de Git. Cada `git push` a `main` genera un despliegue de producción automático; cada rama/PR genera un *preview deployment* con su propia URL para probar antes de mergear.
- **Base de datos y storage:** un único proyecto de Supabase en plan **Pro** (requerido para uso comercial y para tener backups automáticos con retención).
- **Backups:** automáticos, gestionados por Supabase — no hay que configurar `pg_dump` ni cron a mano.
- **Dominio:** se configura directamente en el panel de Vercel (certificado SSL incluido).
- **Costos mensuales de producción:** Vercel Pro ~USD 20/mes + Supabase Pro ~USD 25/mes ⇒ **~USD 45/mes** como piso, con posibles cargos adicionales de uso si el volumen de datos/tráfico crece por encima de lo incluido en cada plan.
- **Monitoreo:** el panel de Supabase y el de Vercel ya traen métricas básicas de uso y errores, sin necesidad de configurar un servicio externo.

---

## 13. Convenciones de código

- TypeScript en modo estricto (`strict: true`).
- ESLint + Prettier configurados desde el inicio.
- Nomenclatura: tablas en `snake_case` (convención de PostgreSQL/Supabase), componentes React en `PascalCase`, Server Actions y hooks en `camelCase`.
- Commits: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `refactor:`, `chore:`).
- Ramas: `main` (producción, despliega solo automáticamente vía Vercel), `feature/nombre-corto` por funcionalidad, con *preview deployment* para revisar antes de mergear.
- Ninguna regla de negocio de la sección 6 se reimplementa en TypeScript "por las dudas" — si la regla vive en un trigger, la aplicación confía en que la base la va a hacer cumplir.

---

## 14. Glosario

| Término | Significado en este sistema |
|---|---|
| Remito | Comprobante de entrega de mercadería, puede existir antes de la factura definitiva. |
| Cuenta corriente | Saldo acumulado de deuda (a favor o en contra) entre el negocio y un cliente o proveedor. |
| Margen | Porcentaje que se suma al costo de un producto para definir su precio de venta. |
| Imputación | Acción de asignar un pago (o parte de él) a una factura específica. |
| Arqueo | Verificación de que el efectivo real en caja coincide con el saldo que muestra el sistema. |
| Presupuesto | Cotización no vinculante hecha a un cliente de un arquitecto; no afecta stock ni caja hasta confirmarse como venta. |
| RLS (Row Level Security) | Mecanismo de PostgreSQL que restringe qué filas puede ver o modificar cada usuario, según reglas definidas en la propia base de datos. |
| Trigger | Función que se ejecuta automáticamente cuando ocurre un evento en una tabla (insertar, actualizar, borrar). |
| Server Action | Función de Next.js que corre en el servidor y puede llamarse directamente desde un componente, sin necesidad de armar un endpoint HTTP aparte. |

---

## 15. Referencia cruzada con el plan comercial

- **Fase 0 (Relevamiento):** confirmar reglas de la sección 6 antes de escribir migraciones.
- **Fase 1 (MVP núcleo):** módulos 2.1, 2.2, 2.3 y una versión mínima de 2.7 (caja), corriendo sobre Supabase local durante el desarrollo, desplegado a Vercel + Supabase Pro recién al final de la fase para que el cliente empiece a probarlo con datos reales.
- **Fase 2 (Consolidación):** módulos 2.4, 2.5, 2.6 y 2.8 completos, más políticas RLS para los tres roles (sección 8).
- **Fase 3 (a futuro):** no cubierta por este documento — facturación fiscal AFIP/ARCA, cálculo por m², reportes avanzados, a especificar aparte si el cliente decide avanzar.
