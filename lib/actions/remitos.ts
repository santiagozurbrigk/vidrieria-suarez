'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { conUsuario } from '@/lib/supabase/server'
import { ejecutar, type Resultado } from '@/lib/resultado'
import { fechaISO, parsear, textoOpcional, textoRequerido } from '@/lib/validacion'
import type { Remito } from '@/lib/supabase/types'

// El precio lo escribe la persona: puede venir de un producto del catálogo o
// ser un renglón libre. Por eso `producto_id` es opcional y `precio_unitario`
// no se valida contra el precio de lista.
const itemSchema = z.object({
  producto_id:     z.string().uuid().nullable().optional(),
  descripcion:     textoRequerido('Cada renglón necesita una descripción'),
  cantidad:        z.coerce.number().positive('La cantidad debe ser mayor a cero'),
  precio_unitario: z.coerce.number().min(0),
  subtotal:        z.coerce.number().min(0),
})

const remitoSchema = z.object({
  cliente_id:       z.string().uuid('Seleccioná un cliente'),
  factura_venta_id: z.string().uuid().nullable().optional(),
  numero:           textoOpcional,
  fecha:            fechaISO,
  notas:            textoOpcional,
  // Un remito sin detalle sigue siendo válido: puede ser sólo el comprobante.
  items:            z.array(itemSchema).default([]),
})

export async function crearRemito(payload: unknown): Promise<Resultado<Remito>> {
  return ejecutar(async () => {
    const data = parsear(remitoSchema, payload)
    const { supabase } = await conUsuario()

    const { data: remito, error } = await supabase.rpc('crear_remito', {
      p_cliente_id:       data.cliente_id,
      p_fecha:            data.fecha,
      p_items:            data.items,
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

    // Los ítems se van por la FK on delete cascade.
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
