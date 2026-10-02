'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { conUsuario } from '@/lib/supabase/server'
import { ejecutar, type Resultado } from '@/lib/resultado'
import { emailOpcional, enumOpcional, parsear, textoOpcional, textoRequerido } from '@/lib/validacion'
import type { Cliente } from '@/lib/supabase/types'

const CONDICIONES_IVA = ['RESPONSABLE_INSCRIPTO', 'MONOTRIBUTISTA', 'EXENTO', 'CONSUMIDOR_FINAL'] as const

const clienteSchema = z.object({
  nombre:        textoRequerido('El nombre es obligatorio'),
  apellido:      textoOpcional,
  razon_social:  textoOpcional,
  cuit:          textoOpcional,
  condicion_iva: enumOpcional(CONDICIONES_IVA),
  telefono:      textoOpcional,
  email:         emailOpcional,
  direccion:     textoOpcional,
  notas:         textoOpcional,
})

export async function crearCliente(formData: FormData): Promise<Resultado<Cliente>> {
  return ejecutar(async () => {
    const data = parsear(clienteSchema, Object.fromEntries(formData))
    const { supabase } = await conUsuario()

    const { data: cliente, error } = await supabase
      .from('clientes')
      .insert(data)
      .select()
      .single()
    if (error) throw error

    revalidatePath('/clientes')
    return cliente
  })
}

export async function actualizarCliente(id: string, formData: FormData): Promise<Resultado<Cliente>> {
  return ejecutar(async () => {
    const data = parsear(clienteSchema, Object.fromEntries(formData))
    const { supabase } = await conUsuario()

    const { data: cliente, error } = await supabase
      .from('clientes')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error

    revalidatePath('/clientes')
    return cliente
  })
}

/**
 * Devuelve el cliente genérico para ventas de mostrador, creándolo si no existe.
 *
 * `facturas_venta.cliente_id` es obligatorio, así que una venta en el local a
 * alguien que no es cliente habitual no tenía dónde cargarse: había que
 * inventar una ficha por cada persona que entraba. Con esto, esas ventas van
 * todas contra una misma ficha "Consumidor Final".
 *
 * Si por una carrera quedaran dos fichas iguales, siempre se devuelve la más
 * vieja, así las ventas no se reparten entre varias.
 */
// No se exporta: en un módulo 'use server' sólo pueden salir funciones async.
const NOMBRE_CONSUMIDOR_FINAL = 'Consumidor Final'

export async function obtenerOCrearConsumidorFinal(): Promise<Resultado<Cliente>> {
  return ejecutar(async () => {
    const { supabase } = await conUsuario()

    const { data: existente, error: errorLectura } = await supabase
      .from('clientes')
      .select('*')
      .eq('nombre', NOMBRE_CONSUMIDOR_FINAL)
      .eq('condicion_iva', 'CONSUMIDOR_FINAL')
      .order('created_at', { ascending: true })
      .limit(1)
    if (errorLectura) throw errorLectura
    if (existente && existente.length > 0) return existente[0]

    const { data: cliente, error } = await supabase
      .from('clientes')
      .insert({
        nombre:        NOMBRE_CONSUMIDOR_FINAL,
        condicion_iva: 'CONSUMIDOR_FINAL',
        notas:         'Ficha genérica para las ventas de mostrador.',
      })
      .select()
      .single()
    if (error) throw error

    revalidatePath('/clientes')
    revalidatePath('/ventas')
    return cliente
  })
}
