'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { conUsuario } from '@/lib/supabase/server'
import { ejecutar, type Resultado } from '@/lib/resultado'
import { emailOpcional, parsear, textoOpcional, textoRequerido } from '@/lib/validacion'
import type { Arquitecto } from '@/lib/supabase/types'

const arquitectoSchema = z.object({
  nombre:    textoRequerido('El nombre es obligatorio'),
  apellido:  textoOpcional,
  estudio:   textoOpcional,
  telefono:  textoOpcional,
  email:     emailOpcional,
  direccion: textoOpcional,
  notas:     textoOpcional,
})

export async function crearArquitecto(formData: FormData): Promise<Resultado<Arquitecto>> {
  return ejecutar(async () => {
    const data = parsear(arquitectoSchema, Object.fromEntries(formData))
    const { supabase } = await conUsuario()

    const { data: arquitecto, error } = await supabase
      .from('arquitectos')
      .insert(data)
      .select()
      .single()
    if (error) throw error

    revalidatePath('/arquitectos')
    return arquitecto
  })
}

export async function actualizarArquitecto(id: string, formData: FormData): Promise<Resultado<Arquitecto>> {
  return ejecutar(async () => {
    const data = parsear(arquitectoSchema, Object.fromEntries(formData))
    const { supabase } = await conUsuario()

    const { data: arquitecto, error } = await supabase
      .from('arquitectos')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error

    revalidatePath('/arquitectos')
    return arquitecto
  })
}
