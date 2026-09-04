import { createServerClient } from '@/lib/supabase/server'
import { LIMITE_LISTADO } from '@/lib/paginacion'
import RemitosClient from './RemitosClient'

export default async function RemitosPage() {
  const supabase = await createServerClient()

  const [
    { data: remitos, count },
    { data: resumen },
    { data: clientes },
    { data: facturasVenta },
  ] = await Promise.all([
    supabase
      .from('remitos')
      .select('*, clientes(nombre, apellido, razon_social), facturas_venta(numero)', { count: 'exact' })
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(LIMITE_LISTADO),
    supabase.from('v_resumen_remitos').select('*').single(),
    supabase
      .from('clientes')
      .select('id, nombre, apellido, razon_social')
      .eq('activo', true)
      .order('nombre'),
    supabase
      .from('facturas_venta')
      .select('id, numero, cliente_id, total')
      .order('fecha', { ascending: false })
      .limit(LIMITE_LISTADO),
  ])

  return (
    <RemitosClient
      remitos={remitos ?? []}
      totalFilas={count}
      resumen={resumen ?? { cantidad: 0, pendientes: 0, entregados: 0, cancelados: 0 }}
      clientes={clientes ?? []}
      facturasVenta={facturasVenta ?? []}
    />
  )
}
