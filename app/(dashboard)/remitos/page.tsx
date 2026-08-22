import { createServerClient } from '@/lib/supabase/server'
import RemitosClient from './RemitosClient'

export default async function RemitosPage() {
  const supabase = await createServerClient()

  const [
    { data: remitos },
    { data: clientes },
    { data: facturasVenta },
  ] = await Promise.all([
    supabase
      .from('remitos')
      .select('*, clientes(nombre, apellido, razon_social), facturas_venta(numero)')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('clientes')
      .select('id, nombre, apellido, razon_social')
      .eq('activo', true)
      .order('nombre'),
    supabase
      .from('facturas_venta')
      .select('id, numero, cliente_id, total')
      .order('fecha', { ascending: false }),
  ])

  return (
    <RemitosClient
      remitos={remitos ?? []}
      clientes={clientes ?? []}
      facturasVenta={facturasVenta ?? []}
    />
  )
}
