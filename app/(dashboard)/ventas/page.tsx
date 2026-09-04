import { createServerClient } from '@/lib/supabase/server'
import { conCeros, LIMITE_LISTADO } from '@/lib/paginacion'
import VentasClient from './VentasClient'

export default async function VentasPage() {
  const supabase = await createServerClient()

  const [
    { data: facturas, count },
    { data: resumen },
    { data: clientes },
    { data: productos },
  ] = await Promise.all([
    supabase
      .from('facturas_venta')
      .select(
        '*, clientes(nombre, apellido, razon_social), factura_venta_items(id, cantidad, precio_unitario, subtotal, productos(nombre, unidad_medida))',
        { count: 'exact' },
      )
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(LIMITE_LISTADO),
    // Los totales se calculan en la base: sumar el array cargado daría el
    // total de la página, no el del negocio.
    supabase.from('v_resumen_ventas').select('*').single(),
    supabase
      .from('clientes')
      .select('id, nombre, apellido, razon_social')
      .eq('activo', true)
      .order('nombre'),
    supabase
      .from('productos')
      .select('id, nombre, unidad_medida, precio_venta, stock_actual')
      .eq('activo', true)
      .order('nombre'),
  ])

  return (
    <VentasClient
      facturas={facturas ?? []}
      totalFilas={count}
      resumen={conCeros(resumen, { cantidad: 0, total_facturado: 0, total_pendiente: 0, pendientes: 0, parciales: 0, pagadas: 0 })}
      clientes={clientes ?? []}
      productos={productos ?? []}
    />
  )
}
