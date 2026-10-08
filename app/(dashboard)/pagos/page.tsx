import { createServerClient } from '@/lib/supabase/server'
import { conCeros, LIMITE_LISTADO } from '@/lib/paginacion'
import PagosClient from './PagosClient'

export default async function PagosPage() {
  const supabase = await createServerClient()

  // Pagos es sólo de consulta: la carga entra por Caja, así que ya no hace falta
  // traer clientes, proveedores ni facturas pendientes.
  const [
    { data: pagos, count },
    { data: resumen },
  ] = await Promise.all([
    supabase
      .from('pagos')
      .select('*, clientes(nombre, apellido, razon_social), proveedores(razon_social)', { count: 'exact' })
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(LIMITE_LISTADO),
    supabase.from('v_resumen_pagos').select('*').single(),
  ])

  return (
    <PagosClient
      pagos={pagos ?? []}
      totalFilas={count}
      resumen={conCeros(resumen, { cantidad: 0, total_cobros: 0, total_pagos: 0 })}
    />
  )
}
