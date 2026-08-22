import { createServerClient } from '@/lib/supabase/server'
import ComprasClient from './ComprasClient'

export default async function ComprasPage() {
  const supabase = await createServerClient()

  const [
    { data: facturas },
    { data: proveedores },
  ] = await Promise.all([
    supabase
      .from('facturas_compra')
      .select('*, proveedores(razon_social)')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('proveedores')
      .select('id, razon_social')
      .eq('activo', true)
      .order('razon_social'),
  ])

  return (
    <ComprasClient
      facturas={facturas ?? []}
      proveedores={proveedores ?? []}
    />
  )
}
