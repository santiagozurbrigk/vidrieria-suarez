import { createServerClient } from '@/lib/supabase/server'
import { LIMITE_LISTADO } from '@/lib/paginacion'
import ProveedoresClient from './ProveedoresClient'

export default async function ProveedoresPage() {
  const supabase = await createServerClient()

  const [{ data: proveedores }, { data: productos }] = await Promise.all([
    supabase.from('proveedores').select('*').order('razon_social').limit(LIMITE_LISTADO),
    supabase
      .from('productos')
      .select('id, nombre, unidad_medida, costo_actual')
      .eq('activo', true)
      .order('nombre')
      .limit(LIMITE_LISTADO),
  ])

  return (
    <ProveedoresClient
      proveedores={proveedores ?? []}
      productos={productos ?? []}
    />
  )
}
