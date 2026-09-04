import { createServerClient } from '@/lib/supabase/server'
import { LIMITE_LISTADO } from '@/lib/paginacion'
import PreciosClient from './PreciosClient'

export default async function PreciosPage() {
  const supabase = await createServerClient()

  const [{ data: proveedores }, { data: productos }] = await Promise.all([
    supabase
      .from('proveedores')
      .select('id, razon_social, margen_ganancia')
      .eq('activo', true)
      .order('razon_social')
      .limit(LIMITE_LISTADO),
    supabase
      .from('productos')
      .select('id, nombre, categoria, unidad_medida, costo_actual, margen_ganancia, precio_venta')
      .eq('activo', true)
      .order('categoria')
      .order('nombre')
      .limit(LIMITE_LISTADO),
  ])

  return <PreciosClient proveedores={proveedores ?? []} productos={productos ?? []} />
}
