import { createServerClient } from '@/lib/supabase/server'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

export default async function PagosPage() {
  const supabase = await createServerClient()
  const { data: pagos } = await supabase
    .from('pagos')
    .select('*, clientes(nombre, apellido), proveedores(razon_social)')
    .order('fecha', { ascending: false })
    .limit(100)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pagos</h1>
        <p className="text-sm text-gray-500 mt-1">Cobros a clientes y pagos a proveedores</p>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="table-th">Fecha</th>
                <th className="table-th">Tipo</th>
                <th className="table-th">Entidad</th>
                <th className="table-th">Medio de pago</th>
                <th className="table-th text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(pagos ?? []).map((p) => {
                const cliente = p.clientes as { nombre: string; apellido: string | null } | null
                const proveedor = p.proveedores as { razon_social: string } | null
                const entidad = p.tipo === 'COBRO_CLIENTE'
                  ? (cliente ? `${cliente.nombre}${cliente.apellido ? ` ${cliente.apellido}` : ''}` : '—')
                  : (proveedor?.razon_social ?? '—')
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="table-td text-gray-500 text-xs">{p.fecha}</td>
                    <td className="table-td">
                      <span className={`badge ${p.tipo === 'COBRO_CLIENTE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {p.tipo === 'COBRO_CLIENTE' ? 'Cobro' : 'Pago'}
                      </span>
                    </td>
                    <td className="table-td font-medium text-gray-900">{entidad}</td>
                    <td className="table-td text-gray-500">{p.medio_pago}</td>
                    <td className={`table-td text-right font-semibold ${p.tipo === 'COBRO_CLIENTE' ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(p.monto)}
                    </td>
                  </tr>
                )
              })}
              {(!pagos || pagos.length === 0) && (
                <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-400">No hay pagos registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
