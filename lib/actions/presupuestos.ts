'use server'

import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'

// ── Schema ─────────────────────────────────────────────────────────────────────
const ItemSchema = z.object({
  producto_id:    z.string().nullable().optional(),
  descripcion:    z.string().min(1),
  cantidad:       z.number().positive(),
  precio_unitario: z.number().min(0),
  subtotal:       z.number().min(0),
})

const PresupuestoSchema = z.object({
  arquitecto_id: z.string().uuid(),
  cliente_id:    z.string().uuid().nullable().optional(),
  obra:          z.string().nullable().optional(),
  numero:        z.string().min(1),
  fecha:         z.string(),
  validez_dias:  z.number().int().positive().default(30),
  notas:         z.string().nullable().optional(),
  items:         z.array(ItemSchema).min(1),
})

// ── crearPresupuesto ───────────────────────────────────────────────────────────
export async function crearPresupuesto(payload: unknown) {
  const parsed = PresupuestoSchema.safeParse(payload)
  if (!parsed.success) throw new Error(parsed.error.errors[0].message)
  const { items, ...header } = parsed.data

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  // Insert header (total is auto-updated by trigger after items)
  const { data: pres, error: presError } = await supabase
    .from('presupuestos')
    .insert({ ...header, created_by: user.id })
    .select('id')
    .single()
  if (presError) throw new Error(presError.message)

  const rows = items.map((item) => ({ ...item, presupuesto_id: pres.id }))
  const { error: itemsError } = await supabase.from('presupuesto_items').insert(rows)
  if (itemsError) {
    // Rollback orphan
    await supabase.from('presupuestos').delete().eq('id', pres.id)
    throw new Error(itemsError.message)
  }
}

// ── eliminarPresupuesto ────────────────────────────────────────────────────────
export async function eliminarPresupuesto(id: string) {
  const supabase = await createServerClient()

  // Verify it's in a deletable state
  const { data: pres } = await supabase.from('presupuestos').select('estado').eq('id', id).single()
  if (!pres) throw new Error('Presupuesto no encontrado')
  if (!['BORRADOR', 'RECHAZADO'].includes(pres.estado)) {
    throw new Error('Solo se pueden eliminar presupuestos en estado Borrador o Rechazado')
  }

  // Delete items first (FK)
  await supabase.from('presupuesto_items').delete().eq('presupuesto_id', id)
  const { error } = await supabase.from('presupuestos').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── actualizarEstado ───────────────────────────────────────────────────────────
export async function actualizarEstadoPresupuesto(id: string, estado: string) {
  const supabase = await createServerClient()
  const { error } = await supabase.from('presupuestos').update({ estado }).eq('id', id)
  if (error) throw new Error(error.message)
}

// ── convertirEnFactura ─────────────────────────────────────────────────────────
// Creates a factura_venta from an approved presupuesto and links back
export async function convertirPresupuestoEnFactura(presupuestoId: string, numero: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  // Fetch presupuesto with items
  const { data: pres, error: presError } = await supabase
    .from('presupuestos')
    .select('*, presupuesto_items(*)')
    .eq('id', presupuestoId)
    .single()
  if (presError || !pres) throw new Error('Presupuesto no encontrado')
  if (!pres.cliente_id) throw new Error('El presupuesto debe tener un cliente para convertirse en factura')

  const items = (pres.presupuesto_items as Array<{
    producto_id: string | null; descripcion: string; cantidad: number; precio_unitario: number; subtotal: number
  }>).filter((i) => i.producto_id) // only items linked to a product can go to a factura

  if (items.length === 0) throw new Error('Ningún ítem del presupuesto tiene producto asociado')

  // Insert factura
  const { data: factura, error: facturaError } = await supabase
    .from('facturas_venta')
    .insert({
      cliente_id: pres.cliente_id,
      numero,
      fecha: new Date().toISOString().slice(0, 10),
      tipo_comprobante: 'FACTURA',
      subtotal: pres.total,
      iva: 0,
      total: pres.total,
      saldo_pendiente: pres.total,
      created_by: user.id,
    })
    .select('id')
    .single()
  if (facturaError) throw new Error(facturaError.message)

  // Insert factura items
  const facturaItems = items.map((i) => ({
    factura_venta_id: factura.id,
    producto_id: i.producto_id!,
    cantidad: i.cantidad,
    precio_unitario: i.precio_unitario,
    subtotal: i.subtotal,
  }))
  const { error: itemsError } = await supabase.from('factura_venta_items').insert(facturaItems)
  if (itemsError) {
    await supabase.from('facturas_venta').delete().eq('id', factura.id)
    throw new Error(itemsError.message)
  }

  // Link presupuesto → factura
  await supabase.from('presupuestos').update({
    convertido_en_factura_id: factura.id,
    estado: 'CONVERTIDO',
  }).eq('id', presupuestoId)
}
