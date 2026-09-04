-- 1. Agregar margen_ganancia a proveedores (default 30%)
ALTER TABLE proveedores
  ADD COLUMN IF NOT EXISTS margen_ganancia numeric NOT NULL DEFAULT 30;

-- 2. Actualizar trigger para usar el margen del proveedor al costear
CREATE OR REPLACE FUNCTION fn_actualizar_costo_producto()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_margen numeric;
BEGIN
  -- Obtener el margen del proveedor de la factura de compra
  SELECT prov.margen_ganancia
  INTO v_margen
  FROM facturas_compra fc
  JOIN proveedores prov ON prov.id = fc.proveedor_id
  WHERE fc.id = NEW.factura_compra_id;

  -- Fallback: usar el margen actual del producto si no hay proveedor
  IF v_margen IS NULL THEN
    SELECT margen_ganancia INTO v_margen FROM productos WHERE id = NEW.producto_id;
  END IF;

  UPDATE productos
  SET
    costo_actual    = NEW.costo_unitario,
    precio_venta    = ROUND(NEW.costo_unitario * (1 + COALESCE(v_margen, 30) / 100), 2),
    margen_ganancia = COALESCE(v_margen, margen_ganancia),
    updated_at      = NOW()
  WHERE id = NEW.producto_id;

  RETURN NEW;
END;
$$;
