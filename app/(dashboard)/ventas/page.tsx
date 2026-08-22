import { createServerClient } from '@/lib/supabase/server'
import VentasClient from './VentasClient'

export default async function VentasPage() {
  const supabase = await createServerClient()

  const [
    { data: facturas },
    { data: clientes },
    { data: productos },
  ] = await Promise.all([
    supabase
      .from('facturas_venta')
      .select('*, clientes(nombre, apellido, razon_social)')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false }),
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
      clientes={clientes ?? []}
      productos={productos ?? []}
    />
  )
}
