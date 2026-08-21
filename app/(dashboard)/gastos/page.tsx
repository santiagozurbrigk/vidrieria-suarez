import { createServerClient } from '@/lib/supabase/server'
import GastosClient from './GastosClient'

export default async function GastosPage() {
  const supabase = await createServerClient()

  const [{ data: gastos }, { data: categorias }] = await Promise.all([
    supabase
      .from('gastos')
      .select('*, categorias_gasto(nombre)')
      .order('fecha', { ascending: false })
      .limit(200),
    supabase.from('categorias_gasto').select('*').eq('activo', true).order('nombre'),
  ])

  return <GastosClient gastos={gastos ?? []} categorias={categorias ?? []} />
}
