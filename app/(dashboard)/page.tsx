import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'

function formatCurrency(n: number | null) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n ?? 0)
}

function mesActual() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
}

const ESTADO_PRES_LABEL: Record<string, string> = {
  BORRADOR: 'Borrador', ENVIADO: 'Enviado', APROBADO: 'Aprobado',
}
const ESTADO_PRES_BADGE: Record<string, string> = {
  BORRADOR: 'bg-gray-100 text-gray-700',
  ENVIADO:  'bg-blue-100 text-blue-800',
  APROBADO: 'bg-green-100 text-green-800',
}

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const mes = mesActual()

  const [
    { data: saldoCajaRaw },
    { data: bajoMinimo },
    { data: ventasMesRaw },
    { data: cobrosAbiertos },
    { data: gastosMesRaw },
    { data: ultimasVentas },
    { data: ultimosPagos },
    { data: presupuestosAbiertos },
    { count: clientesActivos },
  ] = await Promise.all([
    supabase.from('v_saldo_caja').select('saldo_actual, total_ingresos, total_egresos').single(),
    supabase.from('v_productos_bajo_minimo').select('id, nombre, stock_actual, stock_minimo'),
    // Ventas del mes
    supabase.from('facturas_venta').select('total').gte('fecha', `${mes}-01`).lte('fecha', `${mes}-31`),
    // Facturas con saldo pendiente (para cobros abiertos)
    supabase
      .from('facturas_venta')
      .select('id, numero, fecha, total, saldo_pendiente, estado, clientes(nombre, apellido, razon_social)')
      .in('estado', ['PENDIENTE', 'PARCIAL'])
      .order('fecha'),
    // Gastos del mes
    supabase.from('gastos').select('monto').gte('fecha', `${mes}-01`).lte('fecha', `${mes}-31`),
    // Últimas 5 ventas
    supabase
      .from('facturas_venta')
      .select('id, numero, fecha, total, estado, clientes(nombre, apellido, razon_social)')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5),
    // Últimos 5 pagos
    supabase
      .from('pagos')
      .select('id, tipo, monto, medio_pago, fecha, clientes(nombre, apellido, razon_social), proveedores(razon_social)')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5),
    // Presupuestos abiertos
    supabase
      .from('presupuestos')
      .select('id, numero, fecha, total, estado, obra, arquitectos(nombre, apellido, estudio)')
      .in('estado', ['BORRADOR', 'ENVIADO', 'APROBADO'])
      .order('fecha', { ascending: false }),
    // Clientes activos
    supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('activo', true),
  ])

  const saldoCaja    = saldoCajaRaw ?? { saldo_actual: 0, total_ingresos: 0, total_egresos: 0 }
  const ventasMes    = (ventasMesRaw ?? []).reduce((s, f) => s + f.total, 0)
  const gastosMes    = (gastosMesRaw ?? []).reduce((s, g) => s + g.monto, 0)
  const porCobrar    = (cobrosAbiertos ?? []).reduce((s, f) => s + f.saldo_pendiente, 0)

  function clienteLabel(c: { nombre: string; apellido: string | null; razon_social: string | null } | null) {
    if (!c) return '—'
    if (c.razon_social) return c.razon_social
    return [c.nombre, c.apellido].filter(Boolean).join(' ')
  }

  function arquitectoLabel(a: { nombre: string; apellido: string | null; estudio: string | null } | null) {
    if (!a) return '—'
    const nombre = [a.nombre, a.apellido].filter(Boolean).join(' ')
    return a.estudio ? `${nombre} (${a.estudio})` : nombre
  }

  const hoy = new Date()
  const mesNombre = hoy.toLocaleString('es-AR', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inicio</h1>
        <p className="text-sm text-gray-500 mt-1 capitalize">{mesNombre}</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">💰 Saldo caja</p>
          <p className={`mt-1 text-2xl font-bold ${(saldoCaja.saldo_actual ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(saldoCaja.saldo_actual)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {formatCurrency(saldoCaja.total_ingresos)} in · {formatCurrency(saldoCaja.total_egresos)} out
          </p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">🧾 Ventas del mes</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{formatCurrency(ventasMes)}</p>
          <p className="text-xs text-gray-400 mt-1">{ventasMesRaw?.length ?? 0} factura{(ventasMesRaw?.length ?? 0) !== 1 ? 's' : ''}</p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">⏳ Por cobrar</p>
          <p className={`mt-1 text-2xl font-bold ${porCobrar > 0 ? 'text-orange-600' : 'text-green-600'}`}>
            {porCobrar > 0 ? formatCurrency(porCobrar) : '✓ Al día'}
          </p>
          <p className="text-xs text-gray-400 mt-1">{cobrosAbiertos?.length ?? 0} factura{(cobrosAbiertos?.length ?? 0) !== 1 ? 's' : ''} abiertas</p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">📋 Gastos del mes</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{formatCurrency(gastosMes)}</p>
          <p className="text-xs text-gray-400 mt-1">{gastosMesRaw?.length ?? 0} registro{(gastosMesRaw?.length ?? 0) !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Fila central: alertas + presupuestos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Alertas de stock */}
        {(bajoMinimo?.length ?? 0) > 0 ? (
          <div className="card border-yellow-200 bg-yellow-50 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-yellow-800">
              ⚠️ Stock bajo mínimo ({bajoMinimo!.length})
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-yellow-200">
                  <th className="pb-2 text-left font-medium text-yellow-700">Producto</th>
                  <th className="pb-2 text-right font-medium text-yellow-700">Actual</th>
                  <th className="pb-2 text-right font-medium text-yellow-700">Mínimo</th>
                </tr>
              </thead>
              <tbody>
                {bajoMinimo!.map((p) => (
                  <tr key={p.id} className="border-b border-yellow-100 last:border-0">
                    <td className="py-1.5 text-yellow-900 font-medium">{p.nombre}</td>
                    <td className="py-1.5 text-right text-red-600 font-bold">{p.stock_actual}</td>
                    <td className="py-1.5 text-right text-yellow-700">{p.stock_minimo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Link href="/stock" className="mt-3 block text-xs text-yellow-700 hover:text-yellow-900 font-medium">
              Ver stock →
            </Link>
          </div>
        ) : (
          <div className="card border-green-200 bg-green-50 p-4 flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-sm font-semibold text-green-800">Stock en orden</p>
              <p className="text-xs text-green-600">Todos los productos sobre el mínimo.</p>
            </div>
          </div>
        )}

        {/* Presupuestos abiertos */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">
              📄 Presupuestos abiertos ({presupuestosAbiertos?.length ?? 0})
            </h2>
            <Link href="/presupuestos" className="text-xs text-blue-600 hover:text-blue-800 font-medium">Ver todos →</Link>
          </div>
          {(presupuestosAbiertos?.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-400">No hay presupuestos abiertos.</p>
          ) : (
            <div className="space-y-2">
              {presupuestosAbiertos!.slice(0, 5).map((p) => {
                const arq = p.arquitectos as { nombre: string; apellido: string | null; estudio: string | null } | null
                return (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <span className="font-mono text-xs text-gray-500 mr-2">{p.numero}</span>
                      <span className="font-medium text-gray-900 truncate">{arquitectoLabel(arq)}</span>
                      {p.obra && <span className="text-xs text-gray-400 ml-1">· {p.obra}</span>}
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <span className="font-semibold text-gray-900">{formatCurrency(p.total)}</span>
                      <span className={`badge text-xs ${ESTADO_PRES_BADGE[p.estado] ?? 'bg-gray-100 text-gray-700'}`}>
                        {ESTADO_PRES_LABEL[p.estado] ?? p.estado}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Fila inferior: actividad reciente */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Últimas ventas */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">🧾 Últimas ventas</h2>
            <Link href="/ventas" className="text-xs text-blue-600 hover:text-blue-800 font-medium">Ver todas →</Link>
          </div>
          {(ultimasVentas?.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-400">No hay ventas registradas.</p>
          ) : (
            <div className="space-y-2">
              {ultimasVentas!.map((f) => {
                const c = f.clientes as { nombre: string; apellido: string | null; razon_social: string | null } | null
                const estadoBadge = f.estado === 'PAGADA' ? 'bg-green-100 text-green-700'
                  : f.estado === 'PARCIAL' ? 'bg-blue-100 text-blue-700'
                  : 'bg-yellow-100 text-yellow-700'
                return (
                  <div key={f.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <span className="font-mono text-xs text-gray-400 mr-1">{f.numero}</span>
                      <span className="font-medium text-gray-900 truncate">{clienteLabel(c)}</span>
                      <span className="text-xs text-gray-400 ml-1">· {f.fecha}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <span className="font-semibold text-gray-900">{formatCurrency(f.total)}</span>
                      <span className={`badge text-xs ${estadoBadge}`}>{f.estado === 'PAGADA' ? 'Pagada' : f.estado === 'PARCIAL' ? 'Parcial' : 'Pend.'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Últimos pagos */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">💳 Últimos movimientos</h2>
            <Link href="/pagos" className="text-xs text-blue-600 hover:text-blue-800 font-medium">Ver todos →</Link>
          </div>
          {(ultimosPagos?.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-400">No hay pagos registrados.</p>
          ) : (
            <div className="space-y-2">
              {ultimosPagos!.map((p) => {
                const esCobro = p.tipo === 'COBRO_CLIENTE'
                const c = p.clientes as { nombre: string; apellido: string | null; razon_social: string | null } | null
                const pr = p.proveedores as { razon_social: string } | null
                const entidad = esCobro ? clienteLabel(c) : (pr?.razon_social ?? '—')
                return (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <span className={`badge text-xs mr-2 ${esCobro ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {esCobro ? '↑' : '↓'} {esCobro ? 'Cobro' : 'Pago'}
                      </span>
                      <span className="font-medium text-gray-900 truncate">{entidad}</span>
                      <span className="text-xs text-gray-400 ml-1">· {p.fecha}</span>
                    </div>
                    <span className={`font-semibold ml-2 shrink-0 ${esCobro ? 'text-green-600' : 'text-orange-600'}`}>
                      {formatCurrency(p.monto)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mini stats secundarias */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-center">
        {[
          { label: 'Clientes activos', value: clientesActivos ?? 0, href: '/clientes', icon: '👥' },
          { label: 'Facturas por cobrar', value: cobrosAbiertos?.length ?? 0, href: '/ventas', icon: '📄' },
          { label: 'Presupuestos abiertos', value: presupuestosAbiertos?.length ?? 0, href: '/presupuestos', icon: '📋' },
          { label: 'Alertas de stock', value: bajoMinimo?.length ?? 0, href: '/stock', icon: '📦' },
        ].map((s) => (
          <Link key={s.label} href={s.href} className="card p-3 hover:shadow-md transition-shadow">
            <span className="text-xl">{s.icon}</span>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
