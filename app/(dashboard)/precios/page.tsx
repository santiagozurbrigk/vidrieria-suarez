import { createServerClient } from '@/lib/supabase/server'
import PreciosClient from './PreciosClient'

export default async function PreciosPage() {
  const supabase = await createServerClient()
  const { data: productos } = await supabase
    .from('productos')
    .select('*')
    .eq('activo', true)
    .order('categoria')
    .order('nombre')

  return <PreciosClient productos={productos ?? []} />
}
