-- Ítems de remito, con monto cargado a mano.
--
-- Hasta ahora el remito era sólo una cabecera: cliente, número, fecha y notas.
-- No tenía detalle ni importe.
--
-- El pedido concreto es poder escribir el monto sin que lo imponga el precio
-- del producto, así que `precio_unitario` es un valor libre y `producto_id` es
-- OPCIONAL: un renglón puede ser un producto del catálogo (que precarga el
-- precio, pero se puede pisar) o texto libre con su importe.
--
-- El remito NO mueve stock a propósito. Es el comprobante de entrega; el
-- descuento de stock lo hace la factura de venta. Si el remito también
-- descontara, la mercadería se restaría dos veces al facturar lo entregado.

alter table remitos
  add column if not exists total numeric(12,2) not null default 0;

create table if not exists remito_items (
  id              uuid          primary key default gen_random_uuid(),
  remito_id       uuid          not null references remitos(id) on delete cascade,
  -- Nullable: permite el renglón libre, que es justamente lo que se pidió.
  producto_id     uuid          references productos(id),
  descripcion     text          not null,
  cantidad        numeric(12,3) not null check (cantidad > 0),
  precio_unitario numeric(12,2) not null default 0 check (precio_unitario >= 0),
  subtotal        numeric(12,2) not null default 0,
  created_at      timestamptz   not null default now()
);

create index if not exists remito_items_remito_idx on remito_items (remito_id);

-- El total del remito lo mantiene la base, igual que en presupuestos.
create or replace function fn_actualizar_total_remito()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update remitos
     set total = (select coalesce(sum(subtotal), 0) from remito_items
                   where remito_id = coalesce(new.remito_id, old.remito_id))
   where id = coalesce(new.remito_id, old.remito_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_total_remito on remito_items;
create trigger trg_total_remito
  after insert or update or delete on remito_items
  for each row execute function fn_actualizar_total_remito();

revoke all on function fn_actualizar_total_remito() from public, anon, authenticated;

alter table remito_items enable row level security;

drop policy if exists "admin_vendedor_all_remito_items" on remito_items;
create policy "admin_vendedor_all_remito_items"
  on remito_items for all
  using (public.is_vendedor_or_above());

-- ── crear_remito con ítems ───────────────────────────────────────────────────
--
-- p_items: [{ "producto_id": uuid|null, "descripcion": text, "cantidad": num,
--             "precio_unitario": num, "subtotal": num }]
-- Puede venir vacío: un remito sin detalle sigue siendo válido.

drop function if exists crear_remito(uuid, date, uuid, text, text);

create or replace function crear_remito(
  p_cliente_id       uuid,
  p_fecha            date,
  p_items            jsonb default '[]'::jsonb,
  p_factura_venta_id uuid  default null,
  p_notas            text  default null,
  p_numero           text  default null
)
returns remitos
language plpgsql
set search_path = public
as $$
declare
  v_remito remitos;
  v_item   jsonb;
begin
  insert into remitos (cliente_id, factura_venta_id, numero, fecha, estado, notas, created_by)
  values (
    p_cliente_id,
    p_factura_venta_id,
    coalesce(nullif(btrim(p_numero), ''), siguiente_numero('REMITO')),
    p_fecha,
    'PENDIENTE',
    nullif(btrim(coalesce(p_notas, '')), ''),
    auth.uid()
  )
  returning * into v_remito;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    insert into remito_items (
      remito_id, producto_id, descripcion, cantidad, precio_unitario, subtotal
    ) values (
      v_remito.id,
      nullif(v_item->>'producto_id', '')::uuid,
      v_item->>'descripcion',
      (v_item->>'cantidad')::numeric,
      coalesce((v_item->>'precio_unitario')::numeric, 0),
      coalesce((v_item->>'subtotal')::numeric, 0)
    );
  end loop;

  -- El total lo puso el trigger: se relee la fila ya consolidada.
  select * into v_remito from remitos where id = v_remito.id;
  return v_remito;
end;
$$;

grant execute on function crear_remito(uuid, date, jsonb, uuid, text, text) to authenticated;
