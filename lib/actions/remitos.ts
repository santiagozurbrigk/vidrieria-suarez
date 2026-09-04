'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { conUsuario } from '@/lib/supabase/server'
import { ejecutar, type Resultado } from '@/lib/resultado'
import { fechaISO, parsear, textoOpcional } from '@/lib/validacion'
import type { Remito } from '@/lib/supabase/types'

const remitoSchema = z.object({
  cliente_id:       z.string().uuid('Seleccioná un cliente'),
  factura_venta_id: z.string().uuid().nullable().optional(),
  numero:           textoOpcional,
  fecha:            fechaISO,
  notas:            textoOpcional,
})

export async function crearRemito(payload: unknown): Promise<Resultado<Remito>> {
  return ejecutar(async () => {
    const data = parsear(remitoSchema, payload)
    const { supabase } = await conUsuario()

    const { data: remito, error } = await supabase.rpc('crear_remito', {
      p_cliente_id:       data.cliente_id,
      p_fecha:            data.fecha,
      p_factura_venta_id: data.factura_venta_id ?? undefined,
      p_notas:            data.notas ?? undefined,
      // Omitido ⇒ la base asigna el siguiente número correlativo.
      p_numero:           data.numero ?? undefined,
    })
    if (error) throw error

    revalidatePath('/remitos')
    return remito
  })
}

export async function eliminarRemito(id: string): Promise<Resultado> {
  return ejecutar(async () => {
    const { supabase } = await conUsuario()

    const { error } = await supabase.from('remitos').delete().eq('id', id)
    if (error) throw error

    revalidatePath('/remitos')
  })
}

export async function actualizarEstadoRemito(id: string, estado: string): Promise<Resultado> {
  return ejecutar(async () => {
    const nuevoEstado = parsear(z.enum(['PENDIENTE', 'ENTREGADO', 'CANCELADO']), estado)
    const { supabase } = await conUsuario()

    const { error } = await supabase
      .from('remitos')
      .update({ estado: nuevoEstado })
      .eq('id', id)
    if (error) throw error

    revalidatePath('/remitos')
  })
}
