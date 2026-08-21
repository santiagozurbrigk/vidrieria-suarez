import { createServerClient } from '@/lib/supabase/server'

async function getStats(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const [
    { count: productosActivos },
    { data: bajoMinimo },
    { data: saldoCaja },
    { count: facturasPendientes },
    { count: proveedoresActivos },
  ] = await Promise.all([
    supabase.from('productos').select('*', { count: 'exact', head: true }).eq('activo', true),
    supabase.from('v_productos_bajo_minimo').select('id, nombre, stock_actual, stock_minimo'),
    supabase.from('v_saldo_caja').select('saldo_actual, total_ingresos, total_egresos').single(),
    supabase.from('facturas_venta').select('*', { count: 'exact', head: true }).eq('estado', 'PENDIENTE'),
    supabase.from('proveedores').select('*', { count: 'exact', head: true }).eq('activo', true),
  ])

  return {
    productosActivos: productosActivos ?? 0,
    bajoMinimo: bajoMinimo ?? [],
    saldoCaja: saldoCaja ?? { saldo_actual: 0, total_ingresos: 0, total_egresos: 0 },
    facturasPendientes: facturasPendientes ?? 0,
    proveedoresActivos: proveedoresActivos ?? 0,
  }
}

function formatCurrency(n: number | null) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n ?? 0)
}

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const stats = await getStats(supabase)

  const statCards = [
    { label: 'Saldo de caja',         value: formatCurrency(stats.saldoCaja.saldo_actual), icon: '💰', color: 'text-green-600' },
    { label: 'Facturas pendientes',    value: stats.facturasPendientes.toString(),           icon: '📄', color: 'text-yellow-600' },
    { label: 'Productos activos',      value: stats.productosActivos.toString(),             icon: '📦', color: 'text-blue-600' },
    { label: 'Proveedores activos',    value: stats.proveedoresActivos.toString(),           icon: '🏭', color: 'text-purple-600' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inicio</h1>
        <p className="text-sm text-gray-500 mt-1">Resumen del sistema</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
        {statCards.map((s) => (
          <div key={s.label} className="card flex items-center gap-4">
            <span className="text-3xl">{s.icon}</span>
            <div>
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alertas de stock bajo */}
      {stats.bajoMinimo.length > 0 && (
        <div className="card border-yellow-200 bg-yellow-50">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-yellow-800">
            <span>⚠️</span> Productos con stock bajo mínimo ({stats.bajoMinimo.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-yellow-200">
                  <th className="py-2 text-left font-medium text-yellow-700">Producto</th>
                  <th className="py-2 text-right font-medium text-yellow-700">Stock actual</th>
                  <th className="py-2 text-right font-medium text-yellow-700">Mínimo</th>
                </tr>
              </thead>
              <tbody>
                {stats.bajoMinimo.map((p) => (
                  <tr key={p.id} className="border-b border-yellow-100 last:border-0">
                    <td className="py-2 text-yellow-900 font-medium">{p.nombre}</td>
                    <td className="py-2 text-right text-red-600 font-semibold">{p.stock_actual}</td>
                    <td className="py-2 text-right text-yellow-700">{p.stock_minimo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {stats.bajoMinimo.length === 0 && (
        <div className="card border-green-200 bg-green-50">
          <p className="text-sm text-green-700 flex items-center gap-2">
            <span>✅</span> Todos los productos tienen stock sobre el mínimo.
          </p>
        </div>
      )}
    </div>
  )
}
