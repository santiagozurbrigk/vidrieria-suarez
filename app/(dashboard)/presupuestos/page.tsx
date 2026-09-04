import { createServerClient } from '@/lib/supabase/server'
import { LIMITE_LISTADO } from '@/lib/paginacion'
import PresupuestosClient from './PresupuestosClient'

export default async function PresupuestosPage() {
  const supabase = await createServerClient()

  const [
    { data: presupuestos, count },
    { data: resumen },
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
      `, { count: 'exact' })
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(LIMITE_LISTADO),
    supabase.from('v_resumen_presupuestos').select('*').single(),
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
      totalFilas={count}
      resumen={resumen ?? {
        cantidad: 0, total: 0, borradores: 0, enviados: 0,
        aprobados: 0, rechazados: 0, convertidos: 0,
      }}
      arquitectos={arquitectos ?? []}
      clientes={clientes ?? []}
      productos={productos ?? []}
    />
  )
}
