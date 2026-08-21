'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const clienteSchema = z.object({
  nombre: z.string().min(1),
  apellido: z.string().optional(),
  razon_social: z.string().optional(),
  cuit: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  direccion: z.string().optional(),
  notas: z.string().optional(),
})

export async function crearCliente(formData: FormData) {
  const data = clienteSchema.parse(Object.fromEntries(formData))
  const supabase = await createServerClient()
  const { data: cliente, error } = await supabase.from('clientes').insert(data).select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/clientes')
  return cliente
}

export async function actualizarCliente(id: string, formData: FormData) {
  const data = clienteSchema.parse(Object.fromEntries(formData))
  const supabase = await createServerClient()
  const { data: cliente, error } = await supabase.from('clientes').update(data).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/clientes')
  return cliente
}
