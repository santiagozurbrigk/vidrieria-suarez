'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const proveedorSchema = z.object({
  razon_social: z.string().min(1, 'La razón social es obligatoria'),
  cuit: z.string().optional(),
  condicion_iva: z.enum(['RESPONSABLE_INSCRIPTO', 'MONOTRIBUTISTA', 'EXENTO', 'CONSUMIDOR_FINAL']).optional(),
  contacto: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  direccion: z.string().optional(),
  alias_cbu: z.string().optional(),
  notas: z.string().optional(),
})

export async function crearProveedor(formData: FormData) {
  const raw = Object.fromEntries(formData)
  const data = proveedorSchema.parse(raw)
  const supabase = await createServerClient()
  const { data: proveedor, error } = await supabase.from('proveedores').insert(data).select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/proveedores')
  return proveedor
}

export async function actualizarProveedor(id: string, formData: FormData) {
  const data = proveedorSchema.parse(Object.fromEntries(formData))
  const supabase = await createServerClient()
  const { data: proveedor, error } = await supabase.from('proveedores').update(data).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/proveedores')
  return proveedor
}

// Registrar factura de compra con sus ítems (en una sola operación)
const facturaItemSchema = z.object({
  producto_id: z.string().uuid(),
  cantidad: z.coerce.number().positive(),
  costo_unitario: z.coerce.number().min(0),
  subtotal: z.coerce.number().min(0),
})

const facturaSchema = z.object({
  proveedor_id: z.string().uuid(),
  numero: z.string().min(1),
  fecha: z.string(),
  tipo_comprobante: z.string().default('FACTURA'),
  subtotal: z.coerce.number().min(0),
  iva: z.coerce.number().min(0).default(0),
  total: z.coerce.number().positive(),
  notas: z.string().optional(),
  items: z.array(facturaItemSchema).min(1, 'La factura debe tener al menos un ítem'),
})

// ── Nueva variante que crea productos faltantes automáticamente ──────────────
const facturaItemFlexSchema = z
  .object({
    producto_id: z.string().uuid().optional(),
    nombre_nuevo: z.string().min(1).optional(),
    cantidad: z.coerce.number().positive(),
    costo_unitario: z.coerce.number().min(0),
    subtotal: z.coerce.number().min(0),
  })
  .refine((d) => !!d.producto_id || !!d.nombre_nuevo, {
    message: 'Cada ítem debe tener un producto_id existente o un nombre_nuevo',
  })

const facturaConNuevosSchema = z.object({
  proveedor_id: z.string().uuid(),
  numero: z.string().min(1),
  fecha: z.string(),
  tipo_comprobante: z.string().default('FACTURA'),
  subtotal: z.coerce.number().min(0),
  iva: z.coerce.number().min(0).default(0),
  total: z.coerce.number().positive(),
  notas: z.string().optional(),
  items: z.array(facturaItemFlexSchema).min(1, 'La factura debe tener al menos un ítem'),
})

export async function registrarFacturaCompraConNuevosProductos(payload: unknown) {
  const data = facturaConNuevosSchema.parse(payload)
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  // Paso 1 – Crear productos nuevos y resolver todos los IDs
  const resolvedItems: Array<{
    producto_id: string
    cantidad: number
    costo_unitario: number
    subtotal: number
  }> = []

  for (const item of data.items) {
    let productoId = item.producto_id
    if (!productoId) {
      const { data: newProd, error } = await supabase
        .from('productos')
        .insert({
          nombre: item.nombre_nuevo!,
          categoria: 'INSUMO',   // default para productos importados de factura
          unidad_medida: 'UNIDAD',
          costo_actual: item.costo_unitario,
        })
        .select('id')
        .single()
      if (error) throw new Error(`Error al crear producto "${item.nombre_nuevo}": ${error.message}`)
      productoId = newProd.id
    }
    resolvedItems.push({ producto_id: productoId, cantidad: item.cantidad, costo_unitario: item.costo_unitario, subtotal: item.subtotal })
  }

  // Paso 2 – Insertar factura
  const { data: factura, error: facturaError } = await supabase
    .from('facturas_compra')
    .insert({
      proveedor_id: data.proveedor_id,
      numero: data.numero,
      fecha: data.fecha,
      tipo_comprobante: data.tipo_comprobante,
      subtotal: data.subtotal,
      iva: data.iva,
      total: data.total,
      saldo_pendiente: data.total,
      notas: data.notas,
      created_by: user.id,
    })
    .select()
    .single()

  if (facturaError) throw new Error(facturaError.message)

  // Paso 3 – Insertar ítems (los triggers actualizan stock y costos automáticamente)
  const { error: itemsError } = await supabase
    .from('factura_compra_items')
    .insert(resolvedItems.map((i) => ({ factura_compra_id: factura.id, ...i })))
  if (itemsError) throw new Error(itemsError.message)

  revalidatePath('/proveedores')
  revalidatePath('/stock')
  revalidatePath('/precios')
  return factura
}

// ── Variante original (solo productos existentes) ─────────────────────────────
export async function registrarFacturaCompra(payload: unknown) {
  const data = facturaSchema.parse(payload)
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  // Insertar factura
  const { data: factura, error: facturaError } = await supabase
    .from('facturas_compra')
    .insert({
      proveedor_id: data.proveedor_id,
      numero: data.numero,
      fecha: data.fecha,
      tipo_comprobante: data.tipo_comprobante,
      subtotal: data.subtotal,
      iva: data.iva,
      total: data.total,
      saldo_pendiente: data.total,
      notas: data.notas,
      created_by: user.id,
    })
    .select()
    .single()

  if (facturaError) throw new Error(facturaError.message)

  // Insertar ítems (los triggers se disparan automáticamente por cada ítem)
  const items = data.items.map((item) => ({
    factura_compra_id: factura.id,
    producto_id: item.producto_id,
    cantidad: item.cantidad,
    costo_unitario: item.costo_unitario,
    subtotal: item.subtotal,
  }))

  const { error: itemsError } = await supabase.from('factura_compra_items').insert(items)
  if (itemsError) throw new Error(itemsError.message)

  revalidatePath('/proveedores')
  revalidatePath('/stock')
  revalidatePath('/precios')
  return factura
}

// ── Gestión de margen por proveedor ──────────────────────────────────────────
export async function actualizarMargenProveedor(proveedorId: string, margen: number) {
  const m = z.number().min(0).max(1000).parse(margen)
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('proveedores')
    .update({ margen_ganancia: m })
    .eq('id', proveedorId)
  if (error) throw new Error(error.message)
  revalidatePath('/precios')
}

/**
 * Re-aplica el margen actual del proveedor a todos los productos que alguna vez
 * se compraron a ese proveedor, recalculando precio_venta con el costo actual.
 */
export async function recalcularPreciosProveedor(proveedorId: string) {
  const supabase = await createServerClient()

  // Obtener margen del proveedor
  const { data: prov, error: provError } = await supabase
    .from('proveedores')
    .select('margen_ganancia')
    .eq('id', proveedorId)
    .single()
  if (provError) throw new Error(provError.message)

  const margen = prov.margen_ganancia

  // IDs de facturas de este proveedor
  const { data: facturas, error: fErr } = await supabase
    .from('facturas_compra')
    .select('id')
    .eq('proveedor_id', proveedorId)
  if (fErr) throw new Error(fErr.message)

  const facturaIds = facturas?.map((f) => f.id) ?? []
  if (facturaIds.length === 0) return

  // IDs únicos de productos comprados a este proveedor
  const { data: items, error: iErr } = await supabase
    .from('factura_compra_items')
    .select('producto_id')
    .in('factura_compra_id', facturaIds)
  if (iErr) throw new Error(iErr.message)

  const productoIds = [...new Set(items?.map((i) => i.producto_id) ?? [])]
  if (productoIds.length === 0) return

  // Leer costos actuales
  const { data: productos, error: pErr } = await supabase
    .from('productos')
    .select('id, costo_actual')
    .in('id', productoIds)
  if (pErr) throw new Error(pErr.message)

  // Actualizar precio_venta y margen_ganancia en batch
  for (const prod of productos ?? []) {
    const nuevoPrecio = Math.round(prod.costo_actual * (1 + margen / 100) * 100) / 100
    await supabase
      .from('productos')
      .update({ margen_ganancia: margen, precio_venta: nuevoPrecio })
      .eq('id', prod.id)
  }

  revalidatePath('/precios')
  revalidatePath('/stock')
}
