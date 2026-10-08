'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { conUsuario } from '@/lib/supabase/server'
import { ejecutar, type Resultado } from '@/lib/resultado'
import { fechaISO, montoPositivo, parsear, textoOpcional, textoRequerido } from '@/lib/validacion'

// Los egresos se CARGAN desde Caja (registrar_egreso_caja), que es el único
// punto de entrada de plata. Acá sólo se corrigen o se eliminan los que ya
// están, y sirve para cualquiera: un gasto propio o un pago a proveedor.
//
// Las dos operaciones van por RPC porque tocan varias tablas: editar un pago
// reemplaza sus imputaciones y recalcula el saldo de las facturas, y eliminarlo
// se lo devuelve. Hacerlo desde el cliente dejaría la factura inconsistente si
// falla a mitad de camino.

const CATEGORIAS = ['PROVEEDOR', 'SERVICIO', 'RETIRO', 'VARIOS', 'VEHICULOS', 'COMBUSTIBLE'] as const

const imputacionSchema = z.object({
  factura_compra_id: z.string().uuid(),
  monto_imputado:    z.coerce.number().positive(),
})

const egresoSchema = z
  .object({
    /** Id del movimiento de caja, que es lo que lista la pantalla de Gastos. */
    movimiento_id: z.string().uuid(),
    /** Un pago a proveedor no lleva categoría editable: ya es de proveedor. */
    es_pago:       z.boolean().default(false),
    categoria:     z.enum(CATEGORIAS).nullable().optional(),
    concepto:      textoOpcional,
    monto:         montoPositivo,
    medio_pago:    textoRequerido('Elegí el medio de pago'),
    fecha:         fechaISO,
    proveedor_id:  z.string().uuid().nullable().optional(),
    imputaciones:  z.array(imputacionSchema).default([]),
    notas:         textoOpcional,
  })
  .refine((d) => d.es_pago || !!d.concepto, {
    message: 'Detallá de qué es el egreso',
    path:    ['concepto'],
  })
  .refine((d) => d.es_pago || !!d.categoria, {
    message: 'Elegí la categoría del egreso',
    path:    ['categoria'],
  })
  .refine((d) => !d.es_pago || !!d.proveedor_id, {
    message: 'Elegí el proveedor al que se le pagó',
    path:    ['proveedor_id'],
  })

function revalidar() {
  revalidatePath('/gastos')
  revalidatePath('/caja')
  revalidatePath('/proveedores')
  revalidatePath('/compras')
  revalidatePath('/pagos')
  revalidatePath('/')
}

/**
 * Corrige un egreso.
 *
 * Si es un pago a proveedor, se le reemplazan las imputaciones: el monto puede
 * subir o bajar y el saldo de cada factura queda recalculado. Si es un gasto, se
 * actualizan el gasto y su movimiento de caja juntos.
 */
export async function editarEgreso(payload: unknown): Promise<Resultado> {
  return ejecutar(async () => {
    const data = parsear(egresoSchema, payload)

    const imputado = data.imputaciones.reduce((s, i) => s + i.monto_imputado, 0)
    if (imputado > data.monto + 0.001) {
      throw new Error('Lo cargado a las facturas supera el monto del egreso.')
    }
    const { supabase } = await conUsuario()

    const { error } = await supabase.rpc('actualizar_egreso_caja', {
      p_movimiento_id: data.movimiento_id,
      p_monto:         data.monto,
      p_medio_pago:    data.medio_pago,
      p_fecha:         data.fecha,
      p_categoria:     data.es_pago ? undefined : data.categoria ?? undefined,
      p_concepto:      data.concepto ?? undefined,
      p_proveedor_id:  data.proveedor_id ?? undefined,
      p_imputaciones:  data.imputaciones,
      p_notas:         data.notas ?? undefined,
    })
    if (error) throw error

    revalidar()
  })
}

/**
 * Elimina un egreso.
 *
 * Se va con su movimiento de caja. Si era un pago a proveedor, el saldo de las
 * facturas que había pagado vuelve a subir.
 */
export async function eliminarEgreso(movimientoId: string): Promise<Resultado> {
  return ejecutar(async () => {
    const { supabase } = await conUsuario()

    const { error } = await supabase.rpc('eliminar_egreso_caja', {
      p_movimiento_id: parsear(z.string().uuid(), movimientoId),
    })
    if (error) throw error

    revalidar()
  })
}
