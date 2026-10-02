-- ============================================================
-- Caja como entrada y vista única de ingresos y egresos
-- ============================================================
--
-- Antes la plata entraba por tres lugares distintos (Ventas, Gastos, Pagos) y no
-- había forma de ver todo junto. Ahora Caja es el único punto de carga:
--
--   INGRESO ─┬─ venta       → crea la factura de venta (descuenta stock) y la
--            │                cobra en el acto
--            └─ otro motivo → movimiento suelto con su detalle
--
--   EGRESO ──┬─ proveedor   → registra el pago e imputa a las facturas elegidas,
--            │                aceptando pagos parciales
--            └─ resto       → gasto con su categoría
--
-- Un movimiento de caja por operación: nada se cuenta dos veces.

-- ── Categorías de egreso ─────────────────────────────────────────────────────
-- Son fijas y las define el negocio, así que van como enum en vez de tabla:
-- el código puede ramificar sobre ellas (PROVEEDOR pide imputar facturas) y la
-- base garantiza que no entre una categoría inventada.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'categoria_egreso') then
    create type categoria_egreso as enum (
      'PROVEEDOR', 'SERVICIO', 'RETIRO', 'VARIOS', 'VEHICULOS', 'COMBUSTIBLE'
    );
  end if;
end $$;

-- ── movimientos_caja: de dónde viene cada egreso ─────────────────────────────
alter table movimientos_caja add column if not exists categoria_egreso categoria_egreso;
alter table movimientos_caja add column if not exists proveedor_id     uuid references proveedores(id);
alter table movimientos_caja add column if not exists factura_venta_id uuid references facturas_venta(id);

-- La categoría sólo tiene sentido en un egreso.
alter table movimientos_caja drop constraint if exists categoria_solo_en_egresos;
alter table movimientos_caja
  add constraint categoria_solo_en_egresos
  check (categoria_egreso is null or tipo = 'EGRESO');

-- ── gastos: misma categoría que la caja ──────────────────────────────────────
-- `categorias_gasto` quedaba con ocho categorías de texto libre que no son las
-- que pidió el negocio. Se pasa al enum y la columna vieja queda opcional para
-- no romper las filas que ya existan.
alter table gastos add column if not exists categoria_egreso categoria_egreso;
alter table gastos add column if not exists proveedor_id     uuid references proveedores(id);
alter table gastos alter column categoria_id drop not null;

-- ── El gasto copia su categoría al movimiento de caja ────────────────────────
create or replace function fn_caja_por_gasto()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into movimientos_caja (
    tipo, concepto, monto, medio_pago, fecha, gasto_id,
    categoria_egreso, proveedor_id, usuario_id
  ) values (
    'EGRESO', new.concepto, new.monto, new.medio_pago, new.fecha::timestamptz, new.id,
    new.categoria_egreso, new.proveedor_id, new.usuario_id
  );
  return new;
end;
$$;

-- ── El pago a proveedor queda categorizado como tal ──────────────────────────
-- Así aparece en Gastos junto al resto de los egresos, sin generar un segundo
-- movimiento: la plata se registra una sola vez.
create or replace function fn_caja_por_pago()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into movimientos_caja (
    tipo, concepto, monto, medio_pago, fecha, pago_id,
    categoria_egreso, proveedor_id, usuario_id
  ) values (
    case when new.tipo = 'COBRO_CLIENTE' then 'INGRESO' else 'EGRESO' end::tipo_movimiento_caja,
    case
      when new.tipo = 'COBRO_CLIENTE' then 'Cobro a cliente'
      else 'Pago a proveedor' ||
           coalesce(' — ' || (select razon_social from proveedores where id = new.proveedor_id), '')
    end,
    new.monto, new.medio_pago, new.fecha::timestamptz, new.id,
    case when new.tipo = 'PAGO_PROVEEDOR' then 'PROVEEDOR'::categoria_egreso end,
    new.proveedor_id,
    new.created_by
  );
  return new;
end;
$$;

-- ── Vista: todos los egresos, de donde sea que vengan ────────────────────────
-- Es lo que muestra la pantalla de Gastos. Une los gastos propios y los pagos a
-- proveedor leyendo el movimiento de caja, que es la única fuente de la plata.
create or replace view v_egresos as
  select
    m.id                as movimiento_id,
    m.fecha,
    m.concepto,
    m.monto,
    m.medio_pago,
    m.categoria_egreso,
    m.proveedor_id,
    p.razon_social      as proveedor,
    m.gasto_id,
    m.pago_id,
    g.notas,
    -- Sólo los gastos propios se pueden editar o borrar desde Gastos; un pago a
    -- proveedor se toca desde Pagos, porque arrastra imputaciones.
    (m.gasto_id is not null) as editable
  from movimientos_caja m
  left join proveedores p on p.id = m.proveedor_id
  left join gastos      g on g.id = m.gasto_id
  where m.tipo = 'EGRESO';

alter view v_egresos set (security_invoker = true);

-- ── Vistas para los gráficos ─────────────────────────────────────────────────
-- Agrupan en la zona horaria del negocio: con timestamptz, agrupar en UTC
-- manda las ventas de la tarde al día siguiente.
create or replace view v_caja_por_dia as
  select
    (fecha at time zone 'America/Argentina/Buenos_Aires')::date as dia,
    coalesce(sum(case when tipo = 'INGRESO' then monto else 0 end), 0) as ingresos,
    coalesce(sum(case when tipo = 'EGRESO'  then monto else 0 end), 0) as egresos,
    coalesce(sum(case when tipo = 'INGRESO' then monto else 0 end), 0)
      - coalesce(sum(case when tipo = 'EGRESO' then monto else 0 end), 0) as neto,
    count(*) as movimientos
  from movimientos_caja
  group by 1;

alter view v_caja_por_dia set (security_invoker = true);

create or replace view v_caja_por_semana as
  select
    date_trunc('week', (fecha at time zone 'America/Argentina/Buenos_Aires'))::date as semana,
    coalesce(sum(case when tipo = 'INGRESO' then monto else 0 end), 0) as ingresos,
    coalesce(sum(case when tipo = 'EGRESO'  then monto else 0 end), 0) as egresos,
    coalesce(sum(case when tipo = 'INGRESO' then monto else 0 end), 0)
      - coalesce(sum(case when tipo = 'EGRESO' then monto else 0 end), 0) as neto,
    count(*) as movimientos
  from movimientos_caja
  group by 1;

alter view v_caja_por_semana set (security_invoker = true);

create or replace view v_caja_por_mes as
  select
    date_trunc('month', (fecha at time zone 'America/Argentina/Buenos_Aires'))::date as mes,
    coalesce(sum(case when tipo = 'INGRESO' then monto else 0 end), 0) as ingresos,
    coalesce(sum(case when tipo = 'EGRESO'  then monto else 0 end), 0) as egresos,
    coalesce(sum(case when tipo = 'INGRESO' then monto else 0 end), 0)
      - coalesce(sum(case when tipo = 'EGRESO' then monto else 0 end), 0) as neto,
    count(*) as movimientos
  from movimientos_caja
  group by 1;

alter view v_caja_por_mes set (security_invoker = true);

create or replace view v_egresos_por_categoria_mes as
  select
    date_trunc('month', (fecha at time zone 'America/Argentina/Buenos_Aires'))::date as mes,
    coalesce(categoria_egreso::text, 'SIN_CATEGORIA') as categoria,
    sum(monto) as total,
    count(*)   as cantidad
  from movimientos_caja
  where tipo = 'EGRESO'
  group by 1, 2;

alter view v_egresos_por_categoria_mes set (security_invoker = true);

-- ── Ficha genérica de mostrador ──────────────────────────────────────────────
-- La factura de venta necesita un cliente, pero a quien compra en el local no
-- hace falta ficharlo. Se resuelve en la base para que la venta de mostrador sea
-- una sola operación atómica.
create or replace function cliente_consumidor_final()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  select id into v_id
    from clientes
   where nombre = 'Consumidor Final' and condicion_iva = 'CONSUMIDOR_FINAL'
   order by created_at
   limit 1;

  if v_id is null then
    insert into clientes (nombre, condicion_iva, notas)
    values ('Consumidor Final', 'CONSUMIDOR_FINAL',
            'Ficha genérica para las ventas de mostrador.')
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

revoke execute on function cliente_consumidor_final() from public, anon;

-- ── INGRESO por venta ────────────────────────────────────────────────────────
-- Una sola transacción: factura (que descuenta stock por trigger) + cobro
-- completo (que genera el INGRESO de caja por trigger). Si falta stock, no queda
-- ni la factura ni la plata.
create or replace function registrar_venta_caja(
  p_total       numeric,
  p_medio_pago  text,
  p_fecha       date,
  p_items       jsonb,
  p_cliente_id  uuid    default null,
  p_iva         numeric default 0,
  p_notas       text    default null
)
returns movimientos_caja
language plpgsql
set search_path = public
as $$
declare
  v_cliente_id uuid;
  v_factura    facturas_venta;
  v_pago       pagos;
  v_movimiento movimientos_caja;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Elegí qué se vendió.';
  end if;
  if p_total is null or p_total <= 0 then
    raise exception 'El total de la venta debe ser mayor a cero.';
  end if;
  if coalesce(p_iva, 0) > p_total then
    raise exception 'El IVA no puede ser mayor que el total.';
  end if;

  v_cliente_id := coalesce(p_cliente_id, cliente_consumidor_final());

  insert into facturas_venta (
    cliente_id, numero, fecha, tipo_comprobante,
    subtotal, iva, total, saldo_pendiente, notas, created_by
  ) values (
    v_cliente_id,
    siguiente_numero('FACTURA_VENTA'),
    p_fecha,
    'TICKET',
    p_total - coalesce(p_iva, 0),
    coalesce(p_iva, 0),
    p_total,
    p_total,
    nullif(btrim(coalesce(p_notas, '')), ''),
    auth.uid()
  )
  returning * into v_factura;

  -- El trigger de stock corre por ítem y aborta todo si no alcanzan las
  -- existencias.
  insert into factura_venta_items (factura_venta_id, producto_id, cantidad, precio_unitario, subtotal)
  select
    v_factura.id,
    (i->>'producto_id')::uuid,
    (i->>'cantidad')::numeric,
    (i->>'precio_unitario')::numeric,
    (i->>'subtotal')::numeric
  from jsonb_array_elements(p_items) i;

  -- Cobro por el total: fn_caja_por_pago crea el INGRESO.
  insert into pagos (tipo, cliente_id, monto, medio_pago, fecha, notas, created_by)
  values ('COBRO_CLIENTE', v_cliente_id, p_total, p_medio_pago, p_fecha,
          nullif(btrim(coalesce(p_notas, '')), ''), auth.uid())
  returning * into v_pago;

  -- La imputación deja la factura en PAGADA por el trigger de saldos.
  insert into pago_facturas (pago_id, factura_venta_id, monto_imputado)
  values (v_pago.id, v_factura.id, p_total);

  -- El enlace del movimiento a la factura lo pone trg_etiquetar_caja_venta: un
  -- UPDATE directo acá exigiría ser admin y un vendedor no podría vender.
  select * into v_movimiento from movimientos_caja where pago_id = v_pago.id;
  return v_movimiento;
end;
$$;

-- ── INGRESO por otro motivo ──────────────────────────────────────────────────
create or replace function registrar_ingreso_caja(
  p_concepto   text,
  p_monto      numeric,
  p_medio_pago text,
  p_fecha      date,
  p_notas      text default null
)
returns movimientos_caja
language plpgsql
set search_path = public
as $$
declare v_movimiento movimientos_caja;
begin
  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto debe ser mayor a cero.';
  end if;
  if nullif(btrim(coalesce(p_concepto, '')), '') is null then
    raise exception 'Detallá de qué es el ingreso.';
  end if;

  insert into movimientos_caja (tipo, concepto, monto, medio_pago, fecha, usuario_id)
  values ('INGRESO', btrim(p_concepto), p_monto, p_medio_pago,
          p_fecha::timestamptz, auth.uid())
  returning * into v_movimiento;

  return v_movimiento;
end;
$$;

drop function if exists registrar_egreso_caja(categoria_egreso, text, numeric, text, date, uuid, jsonb, text);

-- ── EGRESO ───────────────────────────────────────────────────────────────────
-- Con categoría PROVEEDOR se registra un pago e imputa a las facturas elegidas.
-- La imputación puede ser parcial: si una factura debe $200.000 y se le cargan
-- $100.000, quedan $100.000 pendientes en esa factura y el saldo del proveedor
-- baja $100.000. El trigger fn_saldo_factura_compra actualiza cada factura.
--
-- Con cualquier otra categoría se registra un gasto, y fn_caja_por_gasto genera
-- el movimiento con la categoría puesta.
-- Los parámetros con DEFAULT van al final: `supabase gen types` marca opcional
-- en TypeScript sólo lo que tiene default en SQL.
create or replace function registrar_egreso_caja(
  p_categoria    categoria_egreso,
  p_monto        numeric,
  p_medio_pago   text,
  p_fecha        date,
  p_concepto     text  default null,
  p_proveedor_id uuid  default null,
  p_imputaciones jsonb default '[]'::jsonb,
  p_notas        text  default null
)
returns movimientos_caja
language plpgsql
set search_path = public
as $$
declare
  v_pago       pagos;
  v_gasto      gastos;
  v_movimiento movimientos_caja;
  v_imp        jsonb;
  v_total_imp  numeric := 0;
  v_saldo      numeric;
  v_factura_id uuid;
begin
  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto debe ser mayor a cero.';
  end if;

  if p_categoria = 'PROVEEDOR' then
    if p_proveedor_id is null then
      raise exception 'Elegí el proveedor al que se le pagó.';
    end if;

    select coalesce(sum((value->>'monto_imputado')::numeric), 0)
      into v_total_imp
      from jsonb_array_elements(coalesce(p_imputaciones, '[]'::jsonb));

    if v_total_imp > p_monto + 0.001 then
      raise exception 'Lo imputado a las facturas (%) supera el monto del pago (%).',
        v_total_imp, p_monto;
    end if;

    insert into pagos (tipo, proveedor_id, monto, medio_pago, fecha, notas, created_by)
    values ('PAGO_PROVEEDOR', p_proveedor_id, p_monto, p_medio_pago, p_fecha,
            nullif(btrim(coalesce(p_notas, '')), ''), auth.uid())
    returning * into v_pago;

    for v_imp in select * from jsonb_array_elements(coalesce(p_imputaciones, '[]'::jsonb)) loop
      v_factura_id := (v_imp->>'factura_compra_id')::uuid;

      -- Se bloquea la factura mientras se valida, para que dos pagos simultáneos
      -- no la dejen con saldo negativo.
      select saldo_pendiente into v_saldo
        from facturas_compra
       where id = v_factura_id and proveedor_id = p_proveedor_id
         for update;

      if v_saldo is null then
        raise exception 'La factura elegida no es de este proveedor.';
      end if;

      if (v_imp->>'monto_imputado')::numeric > v_saldo + 0.01 then
        raise exception 'Lo cargado a una factura (%) supera su saldo pendiente (%).',
          (v_imp->>'monto_imputado')::numeric, v_saldo;
      end if;

      insert into pago_facturas (pago_id, factura_compra_id, monto_imputado)
      values (v_pago.id, v_factura_id, (v_imp->>'monto_imputado')::numeric);
    end loop;

    select * into v_movimiento from movimientos_caja where pago_id = v_pago.id;
    return v_movimiento;
  end if;

  -- Resto de las categorías: es un gasto.
  if nullif(btrim(coalesce(p_concepto, '')), '') is null then
    raise exception 'Detallá de qué es el egreso.';
  end if;

  insert into gastos (categoria_egreso, concepto, monto, medio_pago, fecha, notas, usuario_id)
  values (p_categoria, btrim(p_concepto), p_monto, p_medio_pago, p_fecha,
          nullif(btrim(coalesce(p_notas, '')), ''), auth.uid())
  returning * into v_gasto;

  select * into v_movimiento from movimientos_caja where gasto_id = v_gasto.id;
  return v_movimiento;
end;
$$;

-- Las RPC corren con los permisos de quien llama: RLS sigue decidiendo.
revoke execute on function registrar_venta_caja(numeric, text, date, jsonb, uuid, numeric, text) from public, anon;
revoke execute on function registrar_ingreso_caja(text, numeric, text, date, text) from public, anon;
revoke execute on function registrar_egreso_caja(categoria_egreso, numeric, text, date, text, uuid, jsonb, text) from public, anon;

-- ── El movimiento de caja queda atado a la factura que cobra ──────────────────
-- Va como trigger SECURITY DEFINER y no como un UPDATE dentro de la RPC, porque
-- modificar movimientos_caja requiere ser admin y un vendedor tiene que poder
-- cargar una venta de mostrador.
create or replace function fn_etiquetar_caja_venta()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_numero text;
begin
  if new.factura_venta_id is null then
    return new;
  end if;

  select numero into v_numero from facturas_venta where id = new.factura_venta_id;

  update movimientos_caja
     set concepto         = 'Venta ' || coalesce(v_numero, ''),
         factura_venta_id = new.factura_venta_id
   where pago_id = new.pago_id
     and factura_venta_id is null;

  return new;
end;
$$;

drop trigger if exists trg_etiquetar_caja_venta on pago_facturas;
create trigger trg_etiquetar_caja_venta
  after insert on pago_facturas
  for each row execute function fn_etiquetar_caja_venta();

revoke execute on function fn_etiquetar_caja_venta() from public, anon, authenticated;

-- `categorias_gasto` queda sin uso: las categorías ahora son el enum
-- categoria_egreso. No se borra para no romper las filas de `gastos` que todavía
-- apunten a ella con categoria_id.
comment on table categorias_gasto is
  'Sin uso desde la centralización en Caja: la categoría vive en gastos.categoria_egreso.';
