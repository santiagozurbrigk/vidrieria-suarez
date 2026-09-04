'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { conUsuario } from '@/lib/supabase/server'
import { ejecutar, type Resultado } from '@/lib/resultado'
import { parsear, textoOpcional, textoRequerido } from '@/lib/validacion'
import type { Producto } from '@/lib/supabase/types'

const productoSchema = z.object({
  nombre:          textoRequerido('El nombre es obligatorio'),
  descripcion:     textoOpcional,
  categoria:       z.enum(['VIDRIO', 'ALUMINIO', 'ACCESORIO', 'INSUMO']),
  unidad_medida:   z.enum(['UNIDAD', 'M2', 'ML']),
  margen_ganancia: z.coerce.number().min(0).max(999, 'El margen no puede superar 999%'),
  stock_minimo:    z.coerce.number().min(0, 'El stock mínimo no puede ser negativo'),
})

export async function crearProducto(formData: FormData): Promise<Resultado<Producto>> {
  return ejecutar(async () => {
    const data = parsear(productoSchema, Object.fromEntries(formData))
    const { supabase } = await conUsuario()

    const { data: producto, error } = await supabase
      .from('productos')
      .insert({ ...data, precio_venta: 0 })
      .select()
      .single()
    if (error) throw error

    revalidatePath('/stock')
    revalidatePath('/precios')
    return producto
  })
}

export async function actualizarProducto(id: string, formData: FormData): Promise<Resultado<Producto>> {
  return ejecutar(async () => {
    const data = parsear(productoSchema, Object.fromEntries(formData))
    const { supabase } = await conUsuario()

    const { data: producto, error } = await supabase
      .from('productos')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error

    revalidatePath('/stock')
    revalidatePath('/precios')
    return producto
  })
}

const movimientoSchema = z.object({
  tipo:     z.enum(['ENTRADA', 'SALIDA', 'AJUSTE']),
  cantidad: z.coerce.number().positive('La cantidad debe ser mayor a 0'),
  motivo:   textoOpcional,
})

export async function registrarMovimiento(
  productoId: string,
  formData: FormData,
): Promise<Resultado<Producto>> {
  return ejecutar(async () => {
    const data = parsear(movimientoSchema, Object.fromEntries(formData))
    const { supabase, user } = await conUsuario()

    // El trigger de stock aplica el movimiento sobre productos.stock_actual y
    // rechaza las salidas sin existencias suficientes.
    const { error } = await supabase.from('movimientos_stock').insert({
      producto_id: productoId,
      tipo:        data.tipo,
      cantidad:    data.cantidad,
      motivo:      data.motivo,
      usuario_id:  user.id,
    })
    if (error) throw error

    const { data: producto, error: errorLectura } = await supabase
      .from('productos')
      .select('*')
      .eq('id', productoId)
      .single()
    if (errorLectura) throw errorLectura

    revalidatePath('/stock')
    revalidatePath('/')
    return producto
  })
}

/**
 * Cambia el margen de un producto y recalcula su precio de venta.
 * Un solo UPDATE: antes eran dos, y el error del segundo se descartaba.
 */
export async function actualizarMargen(
  productoId: string,
  margen: number,
): Promise<Resultado<Producto>> {
  return ejecutar(async () => {
    const m = parsear(
      z.coerce.number().min(0).max(999, 'El margen no puede superar 999%'),
      margen,
    )
    const { supabase } = await conUsuario()

    const { data: actual, error: errorLectura } = await supabase
      .from('productos')
      .select('costo_actual')
      .eq('id', productoId)
      .single()
    if (errorLectura) throw errorLectura

    const precioVenta = Math.round(actual.costo_actual * (1 + m / 100) * 100) / 100

    const { data: producto, error } = await supabase
      .from('productos')
      .update({ margen_ganancia: m, precio_venta: precioVenta })
      .eq('id', productoId)
      .select()
      .single()
    if (error) throw error

    revalidatePath('/precios')
    revalidatePath('/stock')
    return producto
  })
}
