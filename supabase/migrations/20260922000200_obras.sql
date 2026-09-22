-- Obras como entidad propia, con su arquitecto.
--
-- Hasta ahora "obra" era un campo de texto suelto dentro de cada presupuesto:
-- no se podía listar las obras, ni ver qué presupuestos pertenecen a una, ni
-- saber qué arquitecto la lleva sin abrir los presupuestos uno por uno. Y cada
-- presupuesto repetía el nombre escrito a mano, con las variantes de tipeo que
-- eso implica.
--
-- Ahora la obra se crea una vez, se le asigna un arquitecto, y el presupuesto
-- la elige de una lista.

create table if not exists obras (
  id            uuid        primary key default gen_random_uuid(),
  nombre        text        not null,
  arquitecto_id uuid        not null references arquitectos(id),
  -- El cliente es opcional: al presupuestar puede no estar definido todavía.
  cliente_id    uuid        references clientes(id),
  direccion     text,
  notas         text,
  activo        boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger trg_obras_updated_at
  before update on obras
  for each row execute function fn_set_updated_at();

create index if not exists obras_arquitecto_idx on obras (arquitecto_id);
create index if not exists obras_cliente_idx    on obras (cliente_id);

alter table obras enable row level security;

drop policy if exists "admin_vendedor_all_obras" on obras;
create policy "admin_vendedor_all_obras"
  on obras for all
  using (public.is_vendedor_or_above());

-- ── El presupuesto pasa a apuntar a la obra ──────────────────────────────────
--
-- La columna de texto `obra` se elimina: la base está sin presupuestos
-- cargados, así que no hay datos que migrar. Dejarla conviviendo con `obra_id`
-- sólo generaría dudas sobre cuál de las dos manda.

alter table presupuestos
  add column if not exists obra_id uuid references obras(id);

create index if not exists presupuestos_obra_idx on presupuestos (obra_id);

alter table presupuestos drop column if exists obra;

-- ── crear_presupuesto con obra_id ────────────────────────────────────────────

drop function if exists crear_presupuesto(uuid, date, jsonb, uuid, text, int, text, text);

create or replace function crear_presupuesto(
  p_arquitecto_id uuid,
  p_fecha         date,
  p_items         jsonb,
  p_cliente_id    uuid default null,
  p_obra_id       uuid default null,
  p_validez_dias  int  default 30,
  p_notas         text default null,
  p_numero        text default null
)
returns presupuestos
language plpgsql
set search_path = public
as $$
declare
  v_presupuesto presupuestos;
  v_item        jsonb;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'El presupuesto debe tener al menos un ítem';
  end if;

  -- Si la obra ya tiene arquitecto, manda el de la obra: evita que un
  -- presupuesto quede atribuido a un arquitecto distinto al de su obra.
  if p_obra_id is not null then
    select arquitecto_id into p_arquitecto_id from obras where id = p_obra_id;
    if not found then
      raise exception 'Obra no encontrada';
    end if;
  end if;

  insert into presupuestos (
    arquitecto_id, cliente_id, obra_id, numero, fecha, validez_dias, notas, created_by
  ) values (
    p_arquitecto_id,
    p_cliente_id,
    p_obra_id,
    coalesce(nullif(btrim(p_numero), ''), siguiente_numero('PRESUPUESTO')),
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

  select * into v_presupuesto from presupuestos where id = v_presupuesto.id;
  return v_presupuesto;
end;
$$;

grant execute on function crear_presupuesto(uuid, date, jsonb, uuid, uuid, int, text, text) to authenticated;
