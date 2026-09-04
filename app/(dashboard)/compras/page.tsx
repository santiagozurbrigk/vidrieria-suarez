import { createServerClient } from '@/lib/supabase/server'
import { conCeros, LIMITE_LISTADO } from '@/lib/paginacion'
import ComprasClient from './ComprasClient'

export default async function ComprasPage() {
  const supabase = await createServerClient()

  const [
    { data: facturas, count },
    { data: resumen },
    { data: proveedores },
  ] = await Promise.all([
    supabase
      .from('facturas_compra')
      .select('*, proveedores(razon_social)', { count: 'exact' })
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(LIMITE_LISTADO),
    supabase.from('v_resumen_compras').select('*').single(),
    supabase
      .from('proveedores')
      .select('id, razon_social')
      .eq('activo', true)
      .order('razon_social'),
  ])

  return (
    <ComprasClient
      facturas={facturas ?? []}
      totalFilas={count}
      resumen={conCeros(resumen, { cantidad: 0, total_facturado: 0, total_pendiente: 0, pendientes: 0, parciales: 0, pagadas: 0 })}
      proveedores={proveedores ?? []}
    />
  )
}
