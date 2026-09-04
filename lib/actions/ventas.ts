'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { conUsuario } from '@/lib/supabase/server'
import { ejecutar, type Resultado } from '@/lib/resultado'
import { fechaISO, montoPositivo, parsear, textoOpcional, textoRequerido } from '@/lib/validacion'
import type { FacturaVenta, Pago } from '@/lib/supabase/types'

const itemSchema = z.object({
  producto_id:     z.string().uuid(),
  cantidad:        z.coerce.number().positive('La cantidad debe ser mayor a cero'),
  precio_unitario: z.coerce.number().min(0),
  subtotal:        z.coerce.number().min(0),
})

const facturaVentaSchema = z.object({
  cliente_id:       z.string().uuid('Seleccioná un cliente'),
  numero:           textoOpcional,
  fecha:            fechaISO,
  tipo_comprobante: z.string().trim().default('FACTURA'),
  subtotal:         z.coerce.number().min(0),
  iva:              z.coerce.number().min(0).default(0),
  total:            z.coerce.number().positive('El total debe ser mayor a cero'),
  notas:            textoOpcional,
  items:            z.array(itemSchema).min(1, 'Agregá al menos un producto'),
})

/**
 * Registra la factura y sus ítems en una sola transacción.
 *
 * El trigger de stock valida las existencias por cada ítem; si falta stock,
 * aborta la transacción entera y la cabecera tampoco queda escrita. Antes esto
 * se hacía en dos requests con un DELETE de compensación que podía fallar.
 */
export async function registrarFacturaVenta(payload: unknown): Promise<Resultado<FacturaVenta>> {
  return ejecutar(async () => {
    const data = parsear(facturaVentaSchema, payload)
    const { supabase } = await conUsuario()

    const { data: factura, error } = await supabase.rpc('crear_factura_venta', {
      p_cliente_id:       data.cliente_id,
      p_fecha:            data.fecha,
      p_subtotal:         data.subtotal,
      p_total:            data.total,
      p_items:            data.items,
      p_tipo_comprobante: data.tipo_comprobante,
      p_iva:              data.iva,
      p_notas:            data.notas ?? undefined,
      // Omitido ⇒ la base asigna el siguiente número correlativo.
      p_numero:           data.numero ?? undefined,
    })
    if (error) throw error

    revalidatePath('/ventas')
    revalidatePath('/stock')
    revalidatePath('/')
    return factura
  })
}

const cobroSchema = z.object({
  factura_id: z.string().uuid(),
  monto:      montoPositivo,
  medio_pago: textoRequerido('Elegí un medio de pago'),
  fecha:      fechaISO,
  notas:      textoOpcional,
})

/**
 * Cobro contra una factura. La RPC bloquea la fila de la factura mientras
 * valida el saldo, así que dos cobros simultáneos no pueden dejarla en negativo.
 * El trigger de caja genera el movimiento de INGRESO.
 */
export async function registrarCobroVenta(payload: unknown): Promise<Resultado<Pago>> {
  return ejecutar(async () => {
    const data = parsear(cobroSchema, payload)
    const { supabase } = await conUsuario()

    const { data: pago, error } = await supabase.rpc('registrar_cobro_venta', {
      p_factura_id: data.factura_id,
      p_monto:      data.monto,
      p_medio_pago: data.medio_pago,
      p_fecha:      data.fecha,
      p_notas:      data.notas ?? undefined,
    })
    if (error) throw error

    revalidatePath('/ventas')
    revalidatePath('/pagos')
    revalidatePath('/caja')
    revalidatePath('/')
    return pago
  })
}
