'use client'

import { useState, useMemo } from 'react'
import type { Gasto, CategoriaGasto, GastosPorCategoriaMes } from '@/lib/supabase/types'
import GastoModal from './GastoModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { eliminarGasto } from '@/lib/actions/gastos'
import { exportarExcel } from '@/lib/exportar'
import { nombreMes } from '@/lib/fechas'
import { avisoListadoParcial } from '@/lib/paginacion'
import { useRouter } from 'next/navigation'

type GastoConCategoria = Gasto & { categorias_gasto: { nombre: string } | null }

type Props = {
  gastos:       GastoConCategoria[]
  totalFilas:   number | null
  /** Período mostrado, 'YYYY-MM'. Lo resuelve el servidor desde ?mes=. */
  mes:          string
  meses:        string[]
  totalMes:     number
  porCategoria: GastosPorCategoriaMes[]
  categorias:   CategoriaGasto[]
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

const mesLabel = nombreMes

export default function GastosClient({
  gastos, totalFilas, mes, meses, totalMes, porCategoria, categorias,
}: Props) {
  const router = useRouter()
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editGasto, setEditGasto] = useState<GastoConCategoria | null>(null)
  const [deleteGasto, setDeleteGasto] = useState<GastoConCategoria | null>(null)
  const [deleting, setDeleting]   = useState(false)

  // El mes lo decide el servidor vía ?mes=; acá sólo se filtra dentro de él.
  const [catId, setCatId]   = useState<string>('TODAS')
  const [busqueda, setBusqueda] = useState('')

  const aviso = avisoListadoParcial(gastos.length, totalFilas)

  function cambiarMes(nuevoMes: string) {
    router.push(`/gastos?mes=${nuevoMes}`)
  }

  const filtrados = useMemo(() => {
    return gastos.filter((g) => {
      const matchCat    = catId === 'TODAS' || g.categoria_id === catId
      const matchSearch = busqueda === '' ||
        g.concepto.toLowerCase().includes(busqueda.toLowerCase()) ||
        (g.categorias_gasto?.nombre ?? '').toLowerCase().includes(busqueda.toLowerCase())
      return matchCat && matchSearch
    })
  }, [gastos, catId, busqueda])

  function onSaved() {
    setShowModal(false)
    setEditGasto(null)
    router.refresh()
  }

  async function handleDelete() {
    if (!deleteGasto) return
    setDeleting(true)
    const r = await eliminarGasto(deleteGasto.id)
    setDeleting(false)
    if (!r.ok) { setDeleteError(r.error); return }
    setDeleteGasto(null)
    router.refresh()
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
        {aviso && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {aviso}
          </p>
        )}
        {deleteError && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {deleteError}
          </p>
        )}


        {/* Selector de período + resumen */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start">
          {/* Selector de mes */}
          <div className="card p-4 sm:w-56 shrink-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Período</p>
            <select
              value={mes}
              onChange={(e) => cambiarMes(e.target.value)}
              className="input text-sm"
            >
              {meses.map((ym) => {
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
                    <div key={cat.categoria}>
                      <div className="flex justify-between text-sm mb-0.5">
                        <span className="text-gray-700 truncate">{cat.categoria}</span>
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
          <button
            onClick={() => {
              const rows = filtrados.map((g) => ({
                'Fecha':         g.fecha,
                'Categoría':     g.categorias_gasto?.nombre ?? '—',
                'Concepto':      g.concepto,
                'Medio de pago': g.medio_pago ?? '—',
                'Monto':         g.monto,
              }))
              exportarExcel(rows, 'Gastos', `gastos-${mes}`)
            }}
            className="btn-secondary text-sm"
          >
            ↓ Exportar Excel
          </button>
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
                  <th className="table-th"></th>
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
                    <td className="table-td">
                      <div className="flex items-center gap-3 justify-end">
                        <button
                          onClick={() => setEditGasto(g)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setDeleteGasto(g)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                      No hay gastos en este período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal nuevo gasto */}
      {showModal && (
        <GastoModal
          categorias={categorias}
          onSaved={onSaved}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Modal editar gasto */}
      {editGasto && (
        <GastoModal
          categorias={categorias}
          gasto={editGasto}
          onSaved={onSaved}
          onClose={() => setEditGasto(null)}
        />
      )}

      {/* Confirm eliminar */}
      {deleteGasto && (
        <ConfirmDialog
          title="Eliminar gasto"
          message={`¿Eliminás "${deleteGasto.concepto}" por ${formatCurrency(deleteGasto.monto)}? También se eliminará el movimiento de caja asociado.`}
          confirmLabel="Eliminar"
          variant="danger"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteGasto(null)}
        />
      )}
    </>
  )
}
