import { createServerClient } from '@/lib/supabase/server'
import PagosClient from './PagosClient'

export default async function PagosPage() {
  const supabase = await createServerClient()

  const [
    { data: pagos },
    { data: clientes },
    { data: proveedores },
    { data: facturasVenta },
    { data: facturasCompra },
  ] = await Promise.all([
    supabase
      .from('pagos')
      .select('*, clientes(nombre, apellido, razon_social), proveedores(razon_social)')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('clientes')
      .select('id, nombre, apellido, razon_social')
      .eq('activo', true)
      .order('nombre'),
    supabase
      .from('proveedores')
      .select('id, razon_social')
      .eq('activo', true)
      .order('razon_social'),
    supabase
      .from('facturas_venta')
      .select('id, numero, fecha, total, saldo_pendiente, cliente_id')
      .gt('saldo_pendiente', 0)
      .order('fecha'),
    supabase
      .from('facturas_compra')
      .select('id, numero, fecha, total, saldo_pendiente, proveedor_id')
      .gt('saldo_pendiente', 0)
      .order('fecha'),
  ])

  return (
    <PagosClient
      pagos={pagos ?? []}
      clientes={clientes ?? []}
      proveedores={proveedores ?? []}
      facturasVenta={facturasVenta ?? []}
      facturasCompra={facturasCompra ?? []}
    />
  )
}
