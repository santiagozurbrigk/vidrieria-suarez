import { createServerClient } from '@/lib/supabase/server'

function formatCurrency(n: number | null) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n ?? 0)
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

export default async function CajaPage() {
  const supabase = await createServerClient()

  const [{ data: saldo }, { data: movimientos }] = await Promise.all([
    supabase.from('v_saldo_caja').select('*').single(),
    supabase
      .from('movimientos_caja')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(100),
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Caja</h1>
        <p className="text-sm text-gray-500 mt-1">Movimientos de dinero</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card">
          <p className="text-xs font-medium text-gray-500 mb-1">Saldo actual</p>
          <p className={`text-2xl font-bold ${(saldo?.saldo_actual ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(saldo?.saldo_actual ?? 0)}
          </p>
        </div>
        <div className="card">
          <p className="text-xs font-medium text-gray-500 mb-1">Total ingresos</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(saldo?.total_ingresos ?? 0)}</p>
        </div>
        <div className="card">
          <p className="text-xs font-medium text-gray-500 mb-1">Total egresos</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(saldo?.total_egresos ?? 0)}</p>
        </div>
      </div>

      {/* Movimientos */}
      <div className="card overflow-hidden p-0">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Últimos 100 movimientos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="table-th">Fecha</th>
                <th className="table-th">Tipo</th>
                <th className="table-th">Concepto</th>
                <th className="table-th">Medio de pago</th>
                <th className="table-th text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(movimientos ?? []).map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="table-td text-gray-500 text-xs">{formatDate(m.fecha)}</td>
                  <td className="table-td">
                    <span className={`badge ${
                      m.tipo === 'INGRESO' ? 'bg-green-100 text-green-700' :
                      m.tipo === 'EGRESO'  ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {m.tipo === 'INGRESO' ? '↑' : m.tipo === 'EGRESO' ? '↓' : '↕'} {m.tipo}
                    </span>
                  </td>
                  <td className="table-td font-medium text-gray-900">{m.concepto}</td>
                  <td className="table-td text-gray-500">{m.medio_pago ?? '—'}</td>
                  <td className={`table-td text-right font-semibold ${
                    m.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {m.tipo === 'INGRESO' ? '+' : m.tipo === 'EGRESO' ? '−' : ''}{formatCurrency(m.monto)}
                  </td>
                </tr>
              ))}
              {(!movimientos || movimientos.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-gray-400">
                    No hay movimientos de caja todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
