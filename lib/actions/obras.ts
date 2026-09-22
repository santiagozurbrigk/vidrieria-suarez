'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { conUsuario } from '@/lib/supabase/server'
import { ejecutar, type Resultado } from '@/lib/resultado'
import { parsear, textoOpcional, textoRequerido } from '@/lib/validacion'
import type { Obra } from '@/lib/supabase/types'

const obraSchema = z.object({
  nombre:        textoRequerido('El nombre de la obra es obligatorio'),
  arquitecto_id: z.string().uuid('Seleccioná un arquitecto'),
  // El cliente puede no estar definido al momento de presupuestar.
  cliente_id:    z.string().uuid().nullable().optional(),
  direccion:     textoOpcional,
  notas:         textoOpcional,
})

function revalidar() {
  revalidatePath('/obras')
  revalidatePath('/presupuestos')
}

export async function crearObra(formData: FormData): Promise<Resultado<Obra>> {
  return ejecutar(async () => {
    const crudo = Object.fromEntries(formData)
    const data = parsear(obraSchema, {
      ...crudo,
      // Un select vacío llega como '' y la columna espera null o un uuid.
      cliente_id: crudo.cliente_id || null,
    })
    const { supabase } = await conUsuario()

    const { data: obra, error } = await supabase
      .from('obras')
      .insert(data)
      .select()
      .single()
    if (error) throw error

    revalidar()
    return obra
  })
}

export async function actualizarObra(id: string, formData: FormData): Promise<Resultado<Obra>> {
  return ejecutar(async () => {
    const crudo = Object.fromEntries(formData)
    const data = parsear(obraSchema, {
      ...crudo,
      cliente_id: crudo.cliente_id || null,
    })
    const { supabase } = await conUsuario()

    const { data: obra, error } = await supabase
      .from('obras')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error

    revalidar()
    return obra
  })
}

/**
 * Archiva o reactiva una obra.
 *
 * No se borra: los presupuestos que la referencian tienen que seguir sabiendo
 * a qué obra pertenecen. Archivada sale del selector de presupuestos nuevos.
 */
export async function archivarObra(id: string, activo: boolean): Promise<Resultado> {
  return ejecutar(async () => {
    const { supabase } = await conUsuario()

    const { error } = await supabase.from('obras').update({ activo }).eq('id', id)
    if (error) throw error

    revalidar()
  })
}
