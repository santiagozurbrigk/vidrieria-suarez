import { createServerClient } from '@/lib/supabase/server'
import StockClient from './StockClient'

export default async function StockPage() {
  const supabase = await createServerClient()

  const { data: productos } = await supabase
    .from('productos')
    .select('*')
    .order('nombre')

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('rol').eq('id', user.id).single()
    : { data: null }

  return (
    <StockClient
      productos={productos ?? []}
      userRol={profile?.rol ?? 'VENDEDOR'}
    />
  )
}
