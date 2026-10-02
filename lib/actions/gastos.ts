'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { conUsuario } from '@/lib/supabase/server'
import { ejecutar, type Resultado } from '@/lib/resultado'
import { fechaISO, montoPositivo, parsear, textoOpcional, textoRequerido } from '@/lib/validacion'

const gastoSchema = z.object({
  categoria_egreso: z.enum(['PROVEEDOR', 'SERVICIO', 'RETIRO', 'VARIOS', 'VEHICULOS', 'COMBUSTIBLE']),
  concepto:     textoRequerido('El concepto es obligatorio'),
  monto:        montoPositivo,
  medio_pago:   textoOpcional,
  fecha:        fechaISO,
  notas:        textoOpcional,
})

// No hay registrarGasto: los egresos se cargan desde Caja, que llama a
// registrar_egreso_caja para que la plata y la categoría queden en un solo lugar.
function revalidar() {
  revalidatePath('/gastos')
  revalidatePath('/caja')
  revalidatePath('/')
}

export async function editarGasto(id: string, payload: unknown): Promise<Resultado> {
  return ejecutar(async () => {
    const data = parsear(gastoSchema, payload)
    const { supabase } = await conUsuario()

    const { error } = await supabase
      .from('gastos')
      .update({
        categoria_egreso: data.categoria_egreso,
        concepto:     data.concepto,
        monto:        data.monto,
        medio_pago:   data.medio_pago,
        fecha:        data.fecha,
        notas:        data.notas,
      })
      .eq('id', id)
    if (error) throw error

    // Mantener sincronizado el movimiento de caja que creó el trigger.
    const { error: errorCaja } = await supabase
      .from('movimientos_caja')
      .update({
        // El trigger fn_caja_por_gasto copia el concepto tal cual, sin prefijo:
        // agregarle uno acá dejaba la caja con un texto distinto al del gasto.
        concepto:         data.concepto,
        monto:            data.monto,
        medio_pago:       data.medio_pago,
        fecha:            data.fecha,
        categoria_egreso: data.categoria_egreso,
      })
      .eq('gasto_id', id)
    if (errorCaja) throw errorCaja

    revalidar()
  })
}

export async function eliminarGasto(id: string): Promise<Resultado> {
  return ejecutar(async () => {
    const { supabase } = await conUsuario()

    // El movimiento de caja se va solo: la FK es ON DELETE CASCADE.
    const { error } = await supabase.from('gastos').delete().eq('id', id)
    if (error) throw error

    revalidar()
  })
}
