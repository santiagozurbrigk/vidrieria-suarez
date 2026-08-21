'use client'

import { useState } from 'react'
import type { Producto } from '@/lib/supabase/types'
import ProductoModal from './ProductoModal'
import MovimientoModal from './MovimientoModal'

const CATEGORIAS = { VIDRIO: '🪟', ALUMINIO: '🔩', ACCESORIO: '⚙️', INSUMO: '🧴' }
const UNIDADES = { UNIDAD: 'und.', M2: 'm²', ML: 'ml' }

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

type Props = {
  productos: Producto[]
  userRol: 'ADMIN' | 'VENDEDOR' | 'DEPOSITO'
}

export default function StockClient({ productos: initialProductos, userRol }: Props) {
  const [productos, setProductos] = useState(initialProductos)
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [modalProducto, setModalProducto] = useState<Producto | null | 'nuevo'>(null)
  const [modalMovimiento, setModalMovimiento] = useState<Producto | null>(null)

  const canEdit = userRol === 'ADMIN' || userRol === 'DEPOSITO'

  const filtrados = productos.filter((p) => {
    const matchBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const matchCategoria = categoriaFiltro ? p.categoria === categoriaFiltro : true
    return matchBusqueda && matchCategoria
  })

  function onProductoSaved(p: Producto) {
    setProductos((prev) => {
      const idx = prev.findIndex((x) => x.id === p.id)
      return idx >= 0 ? prev.map((x) => (x.id === p.id ? p : x)) : [p, ...prev]
    })
    setModalProducto(null)
  }

  function onStockActualizado(p: Producto) {
    setProductos((prev) => prev.map((x) => (x.id === p.id ? p : x)))
    setModalMovimiento(null)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock</h1>
          <p className="text-sm text-gray-500 mt-1">{productos.length} productos</p>
        </div>
        {canEdit && (
          <button onClick={() => setModalProducto('nuevo')} className="btn-primary">
            + Nuevo producto
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="mb-4 flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input w-64"
        />
        <select
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          className="input w-44"
        >
          <option value="">Todas las categorías</option>
          {Object.keys(CATEGORIAS).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="table-th">Producto</th>
                <th className="table-th">Categoría</th>
                <th className="table-th text-right">Stock actual</th>
                <th className="table-th text-right">Mínimo</th>
                <th className="table-th text-right">Costo</th>
                <th className="table-th text-right">Precio venta</th>
                <th className="table-th text-right">Margen</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.map((p) => {
                const bajominimo = p.stock_actual <= p.stock_minimo
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td">
                      <div className="font-medium text-gray-900">{p.nombre}</div>
                      {p.descripcion && <div className="text-xs text-gray-400">{p.descripcion}</div>}
                    </td>
                    <td className="table-td">
                      <span className="badge bg-gray-100 text-gray-700">
                        {CATEGORIAS[p.categoria]} {p.categoria}
                      </span>
                    </td>
                    <td className="table-td text-right">
                      <span className={`font-semibold ${bajominimo ? 'text-red-600' : 'text-gray-900'}`}>
                        {p.stock_actual} {UNIDADES[p.unidad_medida]}
                      </span>
                      {bajominimo && <span className="ml-1 text-xs text-red-500">⚠️</span>}
                    </td>
                    <td className="table-td text-right text-gray-500">
                      {p.stock_minimo} {UNIDADES[p.unidad_medida]}
                    </td>
                    <td className="table-td text-right">{formatCurrency(p.costo_actual)}</td>
                    <td className="table-td text-right font-medium text-green-700">{formatCurrency(p.precio_venta)}</td>
                    <td className="table-td text-right text-gray-500">{p.margen_ganancia}%</td>
                    <td className="table-td">
                      <div className="flex justify-end gap-2">
                        {canEdit && (
                          <>
                            <button
                              onClick={() => setModalMovimiento(p)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Movimiento
                            </button>
                            <button
                              onClick={() => setModalProducto(p)}
                              className="text-xs text-gray-500 hover:underline"
                            >
                              Editar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-gray-400">
                    No se encontraron productos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modales */}
      {modalProducto && (
        <ProductoModal
          producto={modalProducto === 'nuevo' ? null : modalProducto}
          onSaved={onProductoSaved}
          onClose={() => setModalProducto(null)}
        />
      )}
      {modalMovimiento && (
        <MovimientoModal
          producto={modalMovimiento}
          onSaved={onStockActualizado}
          onClose={() => setModalMovimiento(null)}
        />
      )}
    </div>
  )
}
