'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const facturaVentaItemSchema = z.object({
  producto_id: z.string().uuid(),
  cantidad: z.coerce.number().positive(),
  precio_unitario: z.coerce.number().min(0),
  subtotal: z.coerce.number().min(0),
})

const facturaVentaSchema = z.object({
  cliente_id: z.string().uuid(),
  numero: z.string().min(1),
  fecha: z.string(),
  tipo_comprobante: z.string().default('FACTURA'),
  subtotal: z.coerce.number().min(0),
  iva: z.coerce.number().min(0).default(0),
  total: z.coerce.number().positive(),
  notas: z.string().optional(),
  items: z.array(facturaVentaItemSchema).min(1, 'Agregá al menos un producto'),
})

export async function registrarFacturaVenta(payload: unknown) {
  const data = facturaVentaSchema.parse(payload)
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  // Insertar cabecera
  const { data: factura, error: facturaError } = await supabase
    .from('facturas_venta')
    .insert({
      cliente_id: data.cliente_id,
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

  // Insertar ítems — el trigger fn_stock_salida_venta valida stock y genera
  // el movimiento SALIDA por cada ítem. Si el stock es insuficiente, lanza excepción.
  const { error: itemsError } = await supabase
    .from('factura_venta_items')
    .insert(
      data.items.map((item) => ({
        factura_venta_id: factura.id,
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal,
      })),
    )

  if (itemsError) {
    // Limpiar la factura huérfana antes de devolver el error
    await supabase.from('facturas_venta').delete().eq('id', factura.id)
    // Extraer el mensaje legible del error de PostgreSQL
    const msg = itemsError.message.includes('Stock insuficiente')
      ? itemsError.message
      : `Error al registrar ítems: ${itemsError.message}`
    throw new Error(msg)
  }

  revalidatePath('/ventas')
  revalidatePath('/stock')
  return factura
}
