'use client'

import { useState } from 'react'
import type { MovimientoCaja, CierreCaja } from '@/lib/supabase/types'
import AjusteModal from './AjusteModal'
import CierreModal from './CierreModal'

type SaldoCaja = { saldo_actual: number; total_ingresos: number; total_egresos: number }
type Filtro = 'TODOS' | 'INGRESO' | 'EGRESO' | 'AJUSTE'

type Props = {
  saldo:       SaldoCaja
  movimientos: MovimientoCaja[]
  cierres:     CierreCaja[]
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

function formatFecha(d: string) {
  return new Date(d).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function CajaClient({ saldo, movimientos: initial, cierres: initialCierres }: Props) {
  const [tab, setTab]           = useState<'movimientos' | 'cierres'>('movimientos')
  const [filtro, setFiltro]     = useState<Filtro>('TODOS')
  const [busqueda, setBusqueda] = useState('')
  const [showAjuste, setShowAjuste] = useState(false)
  const [showCierre, setShowCierre] = useState(false)

  const filtrados = initial.filter((m) => {
    const matchTipo     = filtro === 'TODOS' || m.tipo === filtro
    const matchBusqueda = busqueda === '' ||
      m.concepto.toLowerCase().includes(busqueda.toLowerCase()) ||
      (m.medio_pago ?? '').toLowerCase().includes(busqueda.toLowerCase())
    return matchTipo && matchBusqueda
  })

  function onSaved() {
    window.location.reload()
  }

  const tipoBadge = (tipo: string) => {
    if (tipo === 'INGRESO') return 'bg-green-100 text-green-700'
    if (tipo === 'EGRESO')  return 'bg-red-100 text-red-700'
    return 'bg-gray-100 text-gray-700'
  }

  const tipoIcon = (tipo: string) => tipo === 'INGRESO' ? '↑' : tipo === 'EGRESO' ? '↓' : '↕'

  return (
    <>
      <div>
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Caja</h1>
            <p className="text-sm text-gray-500 mt-1">
              Movimientos generados automáticamente por pagos y gastos, más ajustes manuales.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setShowAjuste(true)} className="btn-secondary">
              ↕ Ajuste manual
            </button>
            <button onClick={() => setShowCierre(true)} className="btn-primary">
              Registrar cierre
            </button>
          </div>
        </div>

        {/* Tarjetas resumen */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Saldo actual</p>
            <p className={`mt-1 text-2xl font-bold ${saldo.saldo_actual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(saldo.saldo_actual)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total ingresos</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{formatCurrency(saldo.total_ingresos)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total egresos</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{formatCurrency(saldo.total_egresos)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex border-b border-gray-200">
          {([['movimientos', 'Movimientos'], ['cierres', 'Cierres']] as const).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
              {t === 'movimientos' && (
                <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 text-xs text-gray-600">
                  {initial.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab: Movimientos */}
        {tab === 'movimientos' && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                {(['TODOS', 'INGRESO', 'EGRESO', 'AJUSTE'] as Filtro[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFiltro(f)}
                    className={`px-3 py-1.5 font-medium transition-colors ${
                      filtro === f ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {f === 'TODOS' ? 'Todos' : f.charAt(0) + f.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Buscar por concepto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="input w-56"
              />
            </div>

            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-100 bg-gray-50">
                    <tr>
                      <th className="table-th">Fecha</th>
                      <th className="table-th">Tipo</th>
                      <th className="table-th">Concepto</th>
                      <th className="table-th">Medio</th>
                      <th className="table-th text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtrados.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                        <td className="table-td text-gray-500 text-xs">{formatFecha(m.fecha)}</td>
                        <td className="table-td">
                          <span className={`badge ${tipoBadge(m.tipo)}`}>
                            {tipoIcon(m.tipo)} {m.tipo === 'INGRESO' ? 'Ingreso' : m.tipo === 'EGRESO' ? 'Egreso' : 'Ajuste'}
                          </span>
                        </td>
                        <td className="table-td font-medium text-gray-900">{m.concepto}</td>
                        <td className="table-td text-gray-500 text-sm">{m.medio_pago ?? '—'}</td>
                        <td className={`table-td text-right font-semibold ${
                          m.tipo === 'INGRESO' ? 'text-green-600' : m.tipo === 'EGRESO' ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {m.tipo === 'INGRESO' ? '+' : m.tipo === 'EGRESO' ? '−' : ''}{formatCurrency(m.monto)}
                        </td>
                      </tr>
                    ))}
                    {filtrados.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-sm text-gray-400">
                          No hay movimientos.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Tab: Cierres */}
        {tab === 'cierres' && (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    <th className="table-th">Fecha</th>
                    <th className="table-th text-right">Saldo sistema</th>
                    <th className="table-th text-right">Saldo real</th>
                    <th className="table-th text-right">Diferencia</th>
                    <th className="table-th">Estado</th>
                    <th className="table-th">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {initialCierres.map((c) => {
                    const dif = c.diferencia ?? 0
                    return (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="table-td text-gray-900 font-medium">{c.fecha}</td>
                        <td className="table-td text-right text-gray-600">{formatCurrency(c.saldo_sistema)}</td>
                        <td className="table-td text-right font-semibold">
                          {c.saldo_real != null ? formatCurrency(c.saldo_real) : '—'}
                        </td>
                        <td className={`table-td text-right font-bold ${
                          dif === 0 ? 'text-green-600' : dif > 0 ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {c.diferencia != null
                            ? `${dif >= 0 ? '+' : ''}${formatCurrency(dif)}`
                            : '—'}
                        </td>
                        <td className="table-td">
                          <span className="badge bg-gray-100 text-gray-700">{c.estado}</span>
                        </td>
                        <td className="table-td text-gray-400 text-xs max-w-xs truncate">{c.notas ?? '—'}</td>
                      </tr>
                    )
                  })}
                  {initialCierres.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                        No hay cierres registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showAjuste && (
        <AjusteModal onSaved={onSaved} onClose={() => setShowAjuste(false)} />
      )}
      {showCierre && (
        <CierreModal
          saldoSistema={saldo.saldo_actual}
          onSaved={onSaved}
          onClose={() => setShowCierre(false)}
        />
      )}
    </>
  )
}
