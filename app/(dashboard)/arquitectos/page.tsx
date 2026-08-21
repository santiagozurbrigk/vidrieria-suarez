import { createServerClient } from '@/lib/supabase/server'
import ArquitectosClient from './ArquitectosClient'

export default async function ArquitectosPage() {
  const supabase = await createServerClient()
  const { data: arquitectos } = await supabase.from('arquitectos').select('*').order('nombre')
  return <ArquitectosClient arquitectos={arquitectos ?? []} />
}
