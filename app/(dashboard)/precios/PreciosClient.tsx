'use client'

import { useState } from 'react'
import type { Producto } from '@/lib/supabase/types'
import { actualizarMargen } from '@/lib/actions/stock'

const CATEGORIAS: Record<string, string> = { VIDRIO: '🪟', ALUMINIO: '🔩', ACCESORIO: '⚙️', INSUMO: '🧴' }

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

export default function PreciosClient({ productos: initial }: { productos: Producto[] }) {
  const [productos, setProductos] = useState(initial)
  const [editando, setEditando] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const filtrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  function startEdit(id: string, margenActual: number) {
    setEditando((prev) => ({ ...prev, [id]: margenActual }))
  }

  async function saveMargen(producto: Producto) {
    const nuevoMargen = editando[producto.id]
    if (nuevoMargen === undefined) return
    setLoading(producto.id)
    setError(null)
    try {
      const actualizado = await actualizarMargen(producto.id, nuevoMargen)
      if (actualizado) {
        setProductos((prev) => prev.map((p) => p.id === producto.id ? actualizado : p))
        setEditando((prev) => { const n = { ...prev }; delete n[producto.id]; return n })
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar')
    } finally {
      setLoading(null)
    }
  }

  function cancelEdit(id: string) {
    setEditando((prev) => { const n = { ...prev }; delete n[id]; return n })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lista de Precios</h1>
        <p className="text-sm text-gray-500 mt-1">
          El precio de venta se calcula automáticamente al registrar una factura de compra.
          Acá podés ajustar el margen por producto.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input w-64"
        />
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="table-th">Producto</th>
                <th className="table-th">Categoría</th>
                <th className="table-th text-right">Costo actual</th>
                <th className="table-th text-right">Margen (%)</th>
                <th className="table-th text-right">Precio de venta</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.map((p) => {
                const isEditing = p.id in editando
                const margenEdit = editando[p.id]
                const precioPreview = isEditing
                  ? Math.round(p.costo_actual * (1 + margenEdit / 100) * 100) / 100
                  : p.precio_venta

                return (
                  <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${isEditing ? 'bg-blue-50' : ''}`}>
                    <td className="table-td font-medium text-gray-900">{p.nombre}</td>
                    <td className="table-td">
                      <span className="badge bg-gray-100 text-gray-700">
                        {CATEGORIAS[p.categoria]} {p.categoria}
                      </span>
                    </td>
                    <td className="table-td text-right">{formatCurrency(p.costo_actual)}</td>
                    <td className="table-td text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={margenEdit}
                          onChange={(e) =>
                            setEditando((prev) => ({ ...prev, [p.id]: parseFloat(e.target.value) || 0 }))
                          }
                          className="input w-24 text-right"
                          autoFocus
                        />
                      ) : (
                        <span className="text-gray-700">{p.margen_ganancia}%</span>
                      )}
                    </td>
                    <td className="table-td text-right font-semibold text-green-700">
                      {formatCurrency(precioPreview)}
                    </td>
                    <td className="table-td">
                      <div className="flex justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveMargen(p)}
                              disabled={loading === p.id}
                              className="text-xs text-green-600 hover:underline disabled:opacity-50"
                            >
                              {loading === p.id ? '...' : 'Guardar'}
                            </button>
                            <button onClick={() => cancelEdit(p.id)} className="text-xs text-gray-400 hover:underline">
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEdit(p.id, p.margen_ganancia)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Editar margen
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-gray-400">No hay productos.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
