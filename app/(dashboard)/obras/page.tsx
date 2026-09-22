import { createServerClient } from '@/lib/supabase/server'
import { LIMITE_LISTADO } from '@/lib/paginacion'
import ObrasClient from './ObrasClient'

export default async function ObrasPage() {
  const supabase = await createServerClient()

  const [
    { data: obras, count },
    { data: arquitectos },
    { data: clientes },
  ] = await Promise.all([
    supabase
      .from('obras')
      .select(
        '*, arquitectos(nombre, apellido, estudio), clientes(nombre, apellido, razon_social), presupuestos(id)',
        { count: 'exact' },
      )
      .order('activo', { ascending: false })
      .order('nombre')
      .limit(LIMITE_LISTADO),
    supabase
      .from('arquitectos')
      .select('id, nombre, apellido, estudio')
      .eq('activo', true)
      .order('nombre'),
    supabase
      .from('clientes')
      .select('id, nombre, apellido, razon_social')
      .eq('activo', true)
      .order('nombre'),
  ])

  return (
    <ObrasClient
      obras={obras ?? []}
      totalFilas={count}
      arquitectos={arquitectos ?? []}
      clientes={clientes ?? []}
    />
  )
}
