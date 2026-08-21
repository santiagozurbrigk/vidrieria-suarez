import { createServerClient } from '@/lib/supabase/server'
import ProveedoresClient from './ProveedoresClient'

export default async function ProveedoresPage() {
  const supabase = await createServerClient()

  const [{ data: proveedores }, { data: productos }] = await Promise.all([
    supabase.from('proveedores').select('*').order('razon_social'),
    supabase.from('productos').select('id, nombre, unidad_medida, costo_actual').eq('activo', true).order('nombre'),
  ])

  return (
    <ProveedoresClient
      proveedores={proveedores ?? []}
      productos={productos ?? []}
    />
  )
}
