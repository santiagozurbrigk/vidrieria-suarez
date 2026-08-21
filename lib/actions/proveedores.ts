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
