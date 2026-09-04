'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { conUsuario } from '@/lib/supabase/server'
import { ejecutar, type Resultado } from '@/lib/resultado'
import { fechaISO, montoPositivo, parsear, textoOpcional, textoRequerido } from '@/lib/validacion'
import type { Pago } from '@/lib/supabase/types'

const imputacionSchema = z.object({
  factura_venta_id:  z.string().uuid().optional(),
  factura_compra_id: z.string().uuid().optional(),
  monto_imputado:    montoPositivo,
})

const pagoSchema = z
  .object({
    tipo:         z.enum(['COBRO_CLIENTE', 'PAGO_PROVEEDOR']),
    cliente_id:   z.string().uuid().optional(),
    proveedor_id: z.string().uuid().optional(),
    monto:        montoPositivo,
    medio_pago:   textoRequerido('Elegí un medio de pago'),
    fecha:        fechaISO,
    notas:        textoOpcional,
    imputaciones: z.array(imputacionSchema).default([]),
  })
  .refine((d) => d.tipo !== 'COBRO_CLIENTE' || !!d.cliente_id, {
    message: 'Seleccioná un cliente.',
    path: ['cliente_id'],
  })
  .refine((d) => d.tipo !== 'PAGO_PROVEEDOR' || !!d.proveedor_id, {
    message: 'Seleccioná un proveedor.',
    path: ['proveedor_id'],
  })
  .refine(
    (d) => d.imputaciones.reduce((s, i) => s + i.monto_imputado, 0) <= d.monto + 0.001,
    { message: 'El total imputado supera el monto del pago.', path: ['imputaciones'] },
  )

/**
 * Registra el pago y sus imputaciones en una sola transacción.
 *
 * La RPC bloquea cada factura mientras valida su saldo, de modo que dos pagos
 * concurrentes no puedan sobre-imputar la misma factura. Los triggers de la
 * base generan el movimiento de caja y recalculan saldo y estado.
 */
export async function registrarPago(payload: unknown): Promise<Resultado<Pago>> {
  return ejecutar(async () => {
    const data = parsear(pagoSchema, payload)
    const { supabase } = await conUsuario()

    const { data: pago, error } = await supabase.rpc('registrar_pago', {
      p_tipo:         data.tipo,
      p_monto:        data.monto,
      p_medio_pago:   data.medio_pago,
      p_fecha:        data.fecha,
      p_cliente_id:   data.cliente_id ?? undefined,
      p_proveedor_id: data.proveedor_id ?? undefined,
      p_notas:        data.notas ?? undefined,
      p_imputaciones: data.imputaciones,
    })
    if (error) throw error

    revalidatePath('/pagos')
    revalidatePath('/ventas')
    revalidatePath('/compras')
    revalidatePath('/caja')
    revalidatePath('/')
    return pago
  })
}
