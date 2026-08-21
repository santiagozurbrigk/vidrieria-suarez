'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const arquitectoSchema = z.object({
  nombre: z.string().min(1),
  apellido: z.string().optional(),
  estudio: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  direccion: z.string().optional(),
  notas: z.string().optional(),
})

export async function crearArquitecto(formData: FormData) {
  const data = arquitectoSchema.parse(Object.fromEntries(formData))
  const supabase = await createServerClient()
  const { data: arq, error } = await supabase.from('arquitectos').insert(data).select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/arquitectos')
  return arq
}

export async function actualizarArquitecto(id: string, formData: FormData) {
  const data = arquitectoSchema.parse(Object.fromEntries(formData))
  const supabase = await createServerClient()
  const { data: arq, error } = await supabase.from('arquitectos').update(data).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/arquitectos')
  return arq
}
