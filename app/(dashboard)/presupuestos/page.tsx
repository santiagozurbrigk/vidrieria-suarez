import { createServerClient } from '@/lib/supabase/server'
import PresupuestosClient from './PresupuestosClient'

export default async function PresupuestosPage() {
  const supabase = await createServerClient()

  const [
    { data: presupuestos },
    { data: arquitectos },
    { data: clientes },
    { data: productos },
  ] = await Promise.all([
    supabase
      .from('presupuestos')
      .select(`
        *,
        arquitectos(nombre, apellido, estudio),
        clientes(nombre, apellido, razon_social)
      `)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('arquitectos')
      .select('id, nombre, apellido, estudio')
      .eq('activo', true)
      .order('nombre'),
    supabase
      .from('clientes')
      .select('id, nombre, apellido, razon_social')
      .eq('activo', true)
      .order('nombre'),
    supabase
      .from('productos')
      .select('id, nombre, unidad_medida, precio_venta')
      .eq('activo', true)
      .order('nombre'),
  ])

  return (
    <PresupuestosClient
      presupuestos={presupuestos ?? []}
      arquitectos={arquitectos ?? []}
      clientes={clientes ?? []}
      productos={productos ?? []}
    />
  )
}
