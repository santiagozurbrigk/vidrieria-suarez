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
