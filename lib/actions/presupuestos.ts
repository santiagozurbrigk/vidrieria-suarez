'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { conUsuario } from '@/lib/supabase/server'
import { ejecutar, type Resultado } from '@/lib/resultado'
import { fechaISO, parsear, textoOpcional, textoRequerido } from '@/lib/validacion'
import type { FacturaVenta, Presupuesto } from '@/lib/supabase/types'

const ESTADOS_ELIMINABLES = ['BORRADOR', 'RECHAZADO']

const itemSchema = z.object({
  producto_id:     z.string().uuid().nullable().optional(),
  descripcion:     textoRequerido('Cada ítem necesita una descripción'),
  cantidad:        z.coerce.number().positive('La cantidad debe ser mayor a cero'),
  precio_unitario: z.coerce.number().min(0),
  subtotal:        z.coerce.number().min(0),
})

const presupuestoSchema = z.object({
  arquitecto_id: z.string().uuid('Seleccioná un arquitecto'),
  cliente_id:    z.string().uuid().nullable().optional(),
  obra:          textoOpcional,
  numero:        textoOpcional,
  fecha:         fechaISO,
  validez_dias:  z.coerce.number().int().positive().default(30),
  notas:         textoOpcional,
  items:         z.array(itemSchema).min(1, 'Agregá al menos un ítem'),
})

export async function crearPresupuesto(payload: unknown): Promise<Resultado<Presupuesto>> {
  return ejecutar(async () => {
    const data = parsear(presupuestoSchema, payload)
    const { supabase } = await conUsuario()

    const { data: presupuesto, error } = await supabase.rpc('crear_presupuesto', {
      p_arquitecto_id: data.arquitecto_id,
      p_cliente_id:    data.cliente_id ?? null,
      p_obra:          data.obra,
      p_fecha:         data.fecha,
      p_validez_dias:  data.validez_dias,
      p_notas:         data.notas,
      p_items:         data.items,
      // null ⇒ la base asigna el siguiente número correlativo.
      p_numero:        data.numero,
    })
    if (error) throw error

    revalidatePath('/presupuestos')
    revalidatePath('/')
    return presupuesto
  })
}

export async function eliminarPresupuesto(id: string): Promise<Resultado> {
  return ejecutar(async () => {
    const { supabase } = await conUsuario()

    const { data: pres, error: errorLectura } = await supabase
      .from('presupuestos')
      .select('estado')
      .eq('id', id)
      .single()
    if (errorLectura) throw errorLectura
    if (!ESTADOS_ELIMINABLES.includes(pres.estado)) {
      throw new Error('Sólo se pueden eliminar presupuestos en estado Borrador o Rechazado')
    }

    // Los ítems se borran por la FK on delete cascade; se hace explícito por si
    // el esquema no la tuviera.
    await supabase.from('presupuesto_items').delete().eq('presupuesto_id', id)

    const { error } = await supabase.from('presupuestos').delete().eq('id', id)
    if (error) throw error

    revalidatePath('/presupuestos')
    revalidatePath('/')
  })
}

export async function actualizarEstadoPresupuesto(id: string, estado: string): Promise<Resultado> {
  return ejecutar(async () => {
    const nuevoEstado = parsear(
      z.enum(['BORRADOR', 'ENVIADO', 'APROBADO', 'RECHAZADO']),
      estado,
    )
    const { supabase } = await conUsuario()

    const { error } = await supabase
      .from('presupuestos')
      .update({ estado: nuevoEstado })
      .eq('id', id)
    if (error) throw error

    revalidatePath('/presupuestos')
    revalidatePath('/')
  })
}

/**
 * Convierte un presupuesto aprobado en factura de venta y las vincula.
 * Todo dentro de una transacción: si el descuento de stock falla, el
 * presupuesto queda sin tocar en vez de marcado como convertido.
 */
export async function convertirPresupuestoEnFactura(
  presupuestoId: string,
  numero?: string,
): Promise<Resultado<FacturaVenta>> {
  return ejecutar(async () => {
    const { supabase } = await conUsuario()

    const { data: factura, error } = await supabase.rpc('convertir_presupuesto_en_factura', {
      p_presupuesto_id: presupuestoId,
      p_numero:         numero?.trim() || null,
    })
    if (error) throw error

    revalidatePath('/presupuestos')
    revalidatePath('/ventas')
    revalidatePath('/stock')
    revalidatePath('/')
    return factura
  })
}
