import { createServerClient } from '@/lib/supabase/server'
import { LIMITE_LISTADO } from '@/lib/paginacion'
import ArquitectosClient from './ArquitectosClient'

export default async function ArquitectosPage() {
  const supabase = await createServerClient()
  const { data: arquitectos } = await supabase
    .from('arquitectos')
    .select('*')
    .order('nombre')
    .limit(LIMITE_LISTADO)
  return <ArquitectosClient arquitectos={arquitectos ?? []} />
}
