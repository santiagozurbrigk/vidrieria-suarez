'use client'

import { useState, useMemo } from 'react'
import type { Gasto, CategoriaGasto } from '@/lib/supabase/types'
import GastoModal from './GastoModal'

type GastoConCategoria = Gasto & { categorias_gasto: { nombre: string } | null }

type Props = {
  gastos:     GastoConCategoria[]
  categorias: CategoriaGasto[]
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

function mesLabel(yyyy: number, mm: number) {
  return new Date(yyyy, mm - 1, 1).toLocaleString('es-AR', { month: 'long', year: 'numeric' })
}

export default function GastosClient({ gastos: initial, categorias }: Props) {
  const [gastos]        = useState(initial)
  const [showModal, setShowModal] = useState(false)

  // Filtros
  const hoy    = new Date()
  const [anio, setAnio]     = useState(hoy.getFullYear())
  const [mes,  setMes]      = useState(hoy.getMonth() + 1)
  const [catId, setCatId]   = useState<string>('TODAS')
  const [busqueda, setBusqueda] = useState('')

  // Lista de meses disponibles (desde el primer gasto hasta hoy)
  const mesesDisponibles = useMemo(() => {
    const set = new Set<string>()
    gastos.forEach((g) => {
      const d = g.fecha.slice(0, 7) // 'YYYY-MM'
      set.add(d)
    })
    // Siempre incluir el mes actual
    set.add(`${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`)
    return Array.from(set).sort().reverse()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gastos])

  // Gastos filtrados
  const filtrados = useMemo(() => {
    const mesStr = `${anio}-${String(mes).padStart(2, '0')}`
    return gastos.filter((g) => {
      const matchMes    = g.fecha.startsWith(mesStr)
      const matchCat    = catId === 'TODAS' || g.categoria_id === catId
      const matchSearch = busqueda === '' ||
        g.concepto.toLowerCase().includes(busqueda.toLowerCase()) ||
        (g.categorias_gasto?.nombre ?? '').toLowerCase().includes(busqueda.toLowerCase())
      return matchMes && matchCat && matchSearch
    })
  }, [gastos, anio, mes, catId, busqueda])

  // Totales por categoría del período filtrado (antes del filtro de catId)
  const mesStr = `${anio}-${String(mes).padStart(2, '0')}`
  const gastosMes = gastos.filter((g) => g.fecha.startsWith(mesStr))
  const totalMes = gastosMes.reduce((s, g) => s + g.monto, 0)

  const porCategoria = useMemo(() => {
    const map = new Map<string, { nombre: string; total: number }>()
    gastosMes.forEach((g) => {
      const nombre = g.categorias_gasto?.nombre ?? 'Sin categoría'
      const prev   = map.get(g.categoria_id) ?? { nombre, total: 0 }
      map.set(g.categoria_id, { nombre, total: prev.total + g.monto })
    })
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gastos, anio, mes])

  function onSaved() {
    setShowModal(false)
    window.location.reload()
  }

  return (
    <>
      <div>
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gastos</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gastos operativos. Cada registro genera un egreso de caja automáticamente.
            </p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary shrink-0">
            + Nuevo gasto
          </button>
        </div>

        {/* Selector de período + resumen */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start">
          {/* Selector de mes */}
          <div className="card p-4 sm:w-56 shrink-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Período</p>
            <select
              value={`${anio}-${String(mes).padStart(2, '0')}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split('-')
                setAnio(parseInt(y)); setMes(parseInt(m))
              }}
              className="input text-sm"
            >
              {mesesDisponibles.map((ym) => {
                const [y, m] = ym.split('-')
                return <option key={ym} value={ym}>{mesLabel(parseInt(y), parseInt(m))}</option>
              })}
            </select>
            <div className="mt-3 flex justify-between items-baseline">
              <span className="text-xs text-gray-500">Total período</span>
              <span className="text-lg font-bold text-red-600">{formatCurrency(totalMes)}</span>
            </div>
          </div>

          {/* Breakdown por categoría */}
          {porCategoria.length > 0 && (
            <div className="card p-4 flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Por categoría</p>
              <div className="space-y-2">
                {porCategoria.map((cat) => {
                  const pct = totalMes > 0 ? (cat.total / totalMes) * 100 : 0
                  return (
                    <div key={cat.nombre}>
                      <div className="flex justify-between text-sm mb-0.5">
                        <span className="text-gray-700 truncate">{cat.nombre}</span>
                        <span className="font-medium text-gray-900 ml-2 shrink-0">{formatCurrency(cat.total)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100">
                        <div
                          className="h-1.5 rounded-full bg-purple-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Filtros */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <select
            value={catId}
            onChange={(e) => setCatId(e.target.value)}
            className="input w-48 text-sm"
          >
            <option value="TODAS">Todas las categorías</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <input
            type="text"
            placeholder="Buscar por concepto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="input w-56"
          />
          <span className="text-sm text-gray-400">
            {filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''} ·{' '}
            <strong className="text-red-600">{formatCurrency(filtrados.reduce((s, g) => s + g.monto, 0))}</strong>
          </span>
        </div>

        {/* Tabla */}
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="table-th">Fecha</th>
                  <th className="table-th">Categoría</th>
                  <th className="table-th">Concepto</th>
                  <th className="table-th">Medio de pago</th>
                  <th className="table-th text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrados.map((g) => (
                  <tr key={g.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td text-gray-500 text-sm">{g.fecha}</td>
                    <td className="table-td">
                      <span className="badge bg-purple-100 text-purple-700">
                        {g.categorias_gasto?.nombre ?? '—'}
                      </span>
                    </td>
                    <td className="table-td font-medium text-gray-900">{g.concepto}</td>
                    <td className="table-td text-gray-500 text-sm">{g.medio_pago ?? '—'}</td>
                    <td className="table-td text-right font-semibold text-red-600">{formatCurrency(g.monto)}</td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm text-gray-400">
                      No hay gastos en este período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <GastoModal
          categorias={categorias}
          onSaved={onSaved}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
