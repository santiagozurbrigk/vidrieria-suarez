'use server'

import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const RemitoSchema = z.object({
  cliente_id:       z.string().uuid(),
  factura_venta_id: z.string().uuid().nullable().optional(),
  numero:           z.string().min(1, 'El número es requerido'),
  fecha:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  notas:            z.string().optional(),
})

export async function crearRemito(payload: unknown) {
  const parsed = RemitoSchema.safeParse(payload)
  if (!parsed.success) throw new Error(parsed.error.errors[0].message)

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase.from('remitos').insert({
    cliente_id:       parsed.data.cliente_id,
    factura_venta_id: parsed.data.factura_venta_id ?? null,
    numero:           parsed.data.numero,
    fecha:            parsed.data.fecha,
    notas:            parsed.data.notas ?? null,
    estado:           'PENDIENTE',
    created_by:       user.id,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/remitos')
}

export async function actualizarEstadoRemito(id: string, estado: string) {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('remitos')
    .update({ estado })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/remitos')
}
