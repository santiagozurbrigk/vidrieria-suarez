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

const editarGastoSchema = z.object({
  categoria_id: z.string().uuid(),
  concepto:     z.string().min(1),
  monto:        z.coerce.number().positive(),
  medio_pago:   z.string().optional(),
  fecha:        z.string(),
  notas:        z.string().optional(),
})

export async function editarGasto(id: string, payload: unknown) {
  const parsed = editarGastoSchema.safeParse(payload)
  if (!parsed.success) throw new Error(parsed.error.errors[0].message)

  const supabase = await createServerClient()

  // Update gasto
  const { error } = await supabase
    .from('gastos')
    .update({
      categoria_id: parsed.data.categoria_id,
      concepto:     parsed.data.concepto,
      monto:        parsed.data.monto,
      medio_pago:   parsed.data.medio_pago ?? null,
      notas:        parsed.data.notas ?? null,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)

  // Sync the auto-created movimiento_caja (concepto + monto)
  await supabase
    .from('movimientos_caja')
    .update({
      concepto: `Gasto: ${parsed.data.concepto}`,
      monto:    parsed.data.monto,
      medio_pago: parsed.data.medio_pago ?? null,
    })
    .eq('gasto_id', id)

  revalidatePath('/gastos')
  revalidatePath('/caja')
}

export async function eliminarGasto(id: string) {
  const supabase = await createServerClient()

  // Remove linked caja movement first (FK constraint)
  await supabase.from('movimientos_caja').delete().eq('gasto_id', id)

  const { error } = await supabase.from('gastos').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/gastos')
  revalidatePath('/caja')
}
