'use server'

import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'

// ── Schema ─────────────────────────────────────────────────────────────────────
const ImputacionSchema = z.object({
  factura_venta_id:  z.string().uuid().optional(),
  factura_compra_id: z.string().uuid().optional(),
  monto_imputado:    z.number().positive(),
})

const PagoSchema = z.object({
  tipo:         z.enum(['COBRO_CLIENTE', 'PAGO_PROVEEDOR']),
  cliente_id:   z.string().uuid().optional(),
  proveedor_id: z.string().uuid().optional(),
  monto:        z.number().positive(),
  medio_pago:   z.string().min(1),
  fecha:        z.string(),
  notas:        z.string().nullable().optional(),
  imputaciones: z.array(ImputacionSchema).default([]),
})

// ── registrarPago ──────────────────────────────────────────────────────────────
// 1. Inserta pagos  → trigger fn_caja_por_pago crea movimiento de caja automático
// 2. Inserta pago_facturas → triggers actualizan saldo_pendiente y estado
export async function registrarPago(payload: unknown) {
  const parsed = PagoSchema.safeParse(payload)
  if (!parsed.success) throw new Error(parsed.error.errors[0].message)
  const { imputaciones, ...header } = parsed.data

  if (header.tipo === 'COBRO_CLIENTE'  && !header.cliente_id)   throw new Error('Seleccioná un cliente.')
  if (header.tipo === 'PAGO_PROVEEDOR' && !header.proveedor_id) throw new Error('Seleccioná un proveedor.')

  const totalImputado = imputaciones.reduce((s, i) => s + i.monto_imputado, 0)
  if (totalImputado > header.monto + 0.001)
    throw new Error('El total imputado supera el monto del pago.')

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  // Insert pago (trigger fn_caja_por_pago fires here)
  const { data: pago, error: pagoError } = await supabase
    .from('pagos')
    .insert({ ...header, created_by: user.id })
    .select('id')
    .single()
  if (pagoError) throw new Error(pagoError.message)

  // Imputar a facturas
  if (imputaciones.length > 0) {
    const rows = imputaciones.map((i) => ({ ...i, pago_id: pago.id }))
    const { error: impError } = await supabase.from('pago_facturas').insert(rows)
    if (impError) {
      await supabase.from('pagos').delete().eq('id', pago.id)
      throw new Error(impError.message)
    }
  }
}
