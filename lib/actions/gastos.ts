'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const gastoSchema = z.object({
  categoria_id: z.string().uuid(),
  concepto: z.string().min(1),
  monto: z.coerce.number().positive(),
  medio_pago: z.string().optional(),
  fecha: z.string(),
  notas: z.string().optional(),
})

export async function registrarGasto(formData: FormData) {
  const data = gastoSchema.parse(Object.fromEntries(formData))
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: gasto, error } = await supabase
    .from('gastos')
    .insert({ ...data, usuario_id: user.id })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/gastos')
  revalidatePath('/caja')
  return gasto
}
