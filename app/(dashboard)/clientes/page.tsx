import { createServerClient } from '@/lib/supabase/server'
import { LIMITE_LISTADO } from '@/lib/paginacion'
import ClientesClient from './ClientesClient'

export default async function ClientesPage() {
  const supabase = await createServerClient()
  const { data: clientes } = await supabase
    .from('clientes')
    .select('*')
    .order('nombre')
    .limit(LIMITE_LISTADO)
  return <ClientesClient clientes={clientes ?? []} />
}
