-- Numeración automática y correlativa de comprobantes.
--
-- Hasta ahora el número de cada factura, presupuesto y remito se tipeaba a mano
-- en el formulario, sin ninguna garantía de unicidad: dos usuarios podían
-- generar el mismo número. Acá se agrega un contador atómico por tipo de
-- comprobante y los índices únicos que faltaban.

-- ── Contadores ────────────────────────────────────────────────────────────────

create table if not exists contadores_comprobante (
  tipo          text primary key,
  prefijo       text   not null default '0001',
  ultimo_numero bigint not null default 0,
  updated_at    timestamptz not null default now()
);

comment on table contadores_comprobante is
  'Último número emitido por tipo de comprobante. Se actualiza sólo vía siguiente_numero().';

insert into contadores_comprobante (tipo) values
  ('FACTURA_VENTA'),
  ('FACTURA_COMPRA'),
  ('PRESUPUESTO'),
  ('REMITO')
on conflict (tipo) do nothing;

-- Sembrar los contadores con el máximo ya emitido, para no pisar los
-- comprobantes históricos cargados a mano. Se toma sólo la parte numérica
-- posterior al guion (formato '0001-00000123'); los números que no siguen ese
-- formato se ignoran.
with maximos as (
  select 'FACTURA_VENTA' as tipo,
         coalesce(max((regexp_replace(numero, '^.*-', ''))::bigint), 0) as maximo
    from facturas_venta where numero ~ '^\d+-\d+$'
  union all
  select 'FACTURA_COMPRA',
         coalesce(max((regexp_replace(numero, '^.*-', ''))::bigint), 0)
    from facturas_compra where numero ~ '^\d+-\d+$'
  union all
  select 'PRESUPUESTO',
         coalesce(max((regexp_replace(numero, '^.*-', ''))::bigint), 0)
    from presupuestos where numero ~ '^\d+-\d+$'
  union all
  select 'REMITO',
         coalesce(max((regexp_replace(numero, '^.*-', ''))::bigint), 0)
    from remitos where numero ~ '^\d+-\d+$'
)
update contadores_comprobante c
   set ultimo_numero = greatest(c.ultimo_numero, m.maximo)
  from maximos m
 where c.tipo = m.tipo;

-- ── siguiente_numero() ────────────────────────────────────────────────────────
--
-- SECURITY DEFINER a propósito: necesita incrementar el contador aunque el rol
-- que llama no tenga permiso de escritura sobre contadores_comprobante. No lee
-- ni devuelve datos de negocio, así que no abre ningún camino para esquivar RLS.
-- `search_path` fijo para que no pueda ser secuestrada con objetos homónimos.

create or replace function siguiente_numero(p_tipo text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefijo text;
  v_numero  bigint;
begin
  -- El UPDATE toma un row lock: dos llamadas concurrentes se serializan y
  -- nunca devuelven el mismo número.
  update contadores_comprobante
     set ultimo_numero = ultimo_numero + 1,
         updated_at    = now()
   where tipo = p_tipo
  returning prefijo, ultimo_numero into v_prefijo, v_numero;

  if not found then
    raise exception 'Tipo de comprobante desconocido: %', p_tipo;
  end if;

  return v_prefijo || '-' || lpad(v_numero::text, 8, '0');
end;
$$;

revoke all on function siguiente_numero(text) from public;
grant execute on function siguiente_numero(text) to authenticated;

alter table contadores_comprobante enable row level security;

-- Sólo lectura para la app; la escritura pasa exclusivamente por la función.
drop policy if exists "contadores_lectura_autenticados" on contadores_comprobante;
create policy "contadores_lectura_autenticados"
  on contadores_comprobante for select
  to authenticated
  using (true);

-- ── Unicidad de los números ───────────────────────────────────────────────────
--
-- Si alguna de estas sentencias falla es porque ya hay duplicados cargados.
-- Las consultas para encontrarlos están en supabase/migrations/README.md.
-- El número de factura de compra lo pone el proveedor, así que sólo tiene que
-- ser único dentro de ese proveedor.

create unique index if not exists facturas_venta_numero_key
  on facturas_venta (numero);

create unique index if not exists facturas_compra_proveedor_numero_key
  on facturas_compra (proveedor_id, numero);

create unique index if not exists presupuestos_numero_key
  on presupuestos (numero);

create unique index if not exists remitos_numero_key
  on remitos (numero);
