'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const productoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  descripcion: z.string().optional(),
  categoria: z.enum(['VIDRIO', 'ALUMINIO', 'ACCESORIO', 'INSUMO']),
  unidad_medida: z.enum(['UNIDAD', 'M2', 'ML']),
  margen_ganancia: z.coerce.number().min(0).max(1000),
  stock_minimo: z.coerce.number().min(0),
})

export async function crearProducto(formData: FormData) {
  const data = productoSchema.parse(Object.fromEntries(formData))
  const supabase = await createServerClient()

  const { data: producto, error } = await supabase
    .from('productos')
    .insert({ ...data, precio_venta: 0 })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/stock')
  return producto
}

export async function actualizarProducto(id: string, formData: FormData) {
  const data = productoSchema.parse(Object.fromEntries(formData))
  const supabase = await createServerClient()

  const { data: producto, error } = await supabase
    .from('productos')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/stock')
  return producto
}

const movimientoSchema = z.object({
  tipo: z.enum(['ENTRADA', 'SALIDA', 'AJUSTE']),
  cantidad: z.coerce.number().positive('La cantidad debe ser mayor a 0'),
  motivo: z.string().optional(),
})

export async function registrarMovimiento(productoId: string, formData: FormData) {
  const data = movimientoSchema.parse(Object.fromEntries(formData))
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase.from('movimientos_stock').insert({
    producto_id: productoId,
    tipo: data.tipo,
    cantidad: data.cantidad,
    motivo: data.motivo,
    usuario_id: user.id,
  })

  if (error) throw new Error(error.message)

  const { data: producto } = await supabase
    .from('productos')
    .select('*')
    .eq('id', productoId)
    .single()

  revalidatePath('/stock')
  return producto
}

export async function actualizarMargen(productoId: string, margen: number) {
  const supabase = await createServerClient()

  const { data: producto, error } = await supabase
    .from('productos')
    .update({
      margen_ganancia: margen,
      // El trigger no recalcula el precio cuando se cambia solo el margen,
      // así que lo calculamos aquí también
    })
    .eq('id', productoId)
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Recalcular precio de venta
  const nuevoPrecio = Math.round(producto.costo_actual * (1 + margen / 100) * 100) / 100
  const { data: actualizado } = await supabase
    .from('productos')
    .update({ precio_venta: nuevoPrecio })
    .eq('id', productoId)
    .select()
    .single()

  revalidatePath('/precios')
  return actualizado
}
