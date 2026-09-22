-- ============================================================
-- El AJUSTE de stock pasa a ser un conteo, no una suma
-- ============================================================
--
-- Antes: `movimientos_stock.cantidad` tenía `check (cantidad > 0)` y la rama
-- AJUSTE del trigger hacía `stock_actual + cantidad`. Como la cantidad nunca
-- podía ser negativa, un ajuste sólo podía SUBIR el stock: era imposible
-- cargar un inventario inicial a la baja, descontar una rotura o corregir una
-- carga de más.
--
-- Ahora: en un AJUSTE, `cantidad` es el stock que quedó después de contar.
-- El trigger lo asigna en vez de sumarlo, así que el ajuste sube o baja según
-- lo que se haya contado. ENTRADA y SALIDA no cambian.

-- El conteo puede dar cero ("no quedaba nada"), así que la cantidad de un
-- AJUSTE tiene que poder ser 0. Para ENTRADA y SALIDA sigue siendo > 0.
do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.movimientos_stock'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%cantidad%'
  loop
    execute format('alter table public.movimientos_stock drop constraint %I', c.conname);
  end loop;
end $$;

alter table movimientos_stock
  add constraint movimientos_stock_cantidad_check
  check (case when tipo = 'AJUSTE' then cantidad >= 0 else cantidad > 0 end);

comment on column movimientos_stock.cantidad is
  'En ENTRADA y SALIDA es cuánto se movió. En AJUSTE es el stock resultante del conteo.';

create or replace function fn_actualizar_stock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  case new.tipo
    when 'ENTRADA' then
      update productos set stock_actual = stock_actual + new.cantidad, updated_at = now()
      where id = new.producto_id;

    when 'SALIDA' then
      -- Un solo UPDATE con la guarda adentro: leer el stock y recién después
      -- actualizarlo dejaba una ventana para que dos salidas simultáneas
      -- pasaran las dos la validación y el stock terminara en negativo.
      update productos set stock_actual = stock_actual - new.cantidad, updated_at = now()
      where id = new.producto_id and stock_actual >= new.cantidad;
      if not found then
        raise exception 'Stock insuficiente para el producto %', new.producto_id;
      end if;

    when 'AJUSTE' then
      -- `cantidad` es el stock contado, no un delta: se asigna tal cual.
      update productos set stock_actual = new.cantidad, updated_at = now()
      where id = new.producto_id;
  end case;
  return new;
end;
$$;
