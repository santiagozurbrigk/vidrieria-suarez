'use client'

import { useState } from 'react'
import type { Producto, Proveedor } from '@/lib/supabase/types'
import { actualizarMargenProveedor, recalcularPreciosProveedor } from '@/lib/actions/proveedores'
import { useRouter } from 'next/navigation'

type ProveedorSlim = Pick<Proveedor, 'id' | 'razon_social' | 'margen_ganancia'>
type ProductoSlim = Pick<Producto, 'id' | 'nombre' | 'categoria' | 'unidad_medida' | 'costo_actual' | 'margen_ganancia' | 'precio_venta'>

const CATEGORIAS: Record<string, string> = { VIDRIO: '🪟', ALUMINIO: '🔩', ACCESORIO: '⚙️', INSUMO: '🧴' }

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

// ── Fila de proveedor ────────────────────────────────────────────────────────
function ProveedorRow({ prov }: { prov: ProveedorSlim }) {
  const router = useRouter()
  const [margen, setMargen] = useState(prov.margen_ganancia)
  const [editando, setEditando] = useState(false)
  const [draft, setDraft] = useState(prov.margen_ganancia)
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applyMsg, setApplyMsg] = useState<string | null>(null)

  async function guardar() {
    setSaving(true)
    setError(null)
    const r = await actualizarMargenProveedor(prov.id, draft)
    setSaving(false)
    if (!r.ok) { setError(r.error); return }
    setMargen(draft)
    setEditando(false)
  }

  async function aplicar() {
    setApplying(true)
    setApplyMsg(null)
    setError(null)
    const r = await recalcularPreciosProveedor(prov.id)
    setApplying(false)
    if (!r.ok) { setError(r.error); return }
    setApplyMsg(`✓ ${r.data} producto${r.data === 1 ? '' : 's'} actualizado${r.data === 1 ? '' : 's'}`)
    router.refresh()
  }

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="table-td font-medium text-gray-900">{prov.razon_social}</td>
      <td className="table-td text-right w-40">
        {editando ? (
          <input
            type="number"
            step="0.5"
            min="0"
            max="1000"
            value={draft}
            onChange={(e) => setDraft(parseFloat(e.target.value) || 0)}
            className="input w-24 text-right"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') guardar(); if (e.key === 'Escape') setEditando(false) }}
          />
        ) : (
          <span className="font-semibold text-gray-900">{margen}%</span>
        )}
      </td>
      <td className="table-td">
        <div className="flex items-center gap-3 flex-wrap">
          {editando ? (
            <>
              <button
                onClick={guardar}
                disabled={saving}
                className="text-xs text-green-600 hover:underline disabled:opacity-50"
              >
                {saving ? '...' : 'Guardar'}
              </button>
              <button
                onClick={() => { setEditando(false); setDraft(margen) }}
                className="text-xs text-gray-400 hover:underline"
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              onClick={() => { setDraft(margen); setEditando(true) }}
              className="text-xs text-blue-600 hover:underline"
            >
              Editar
            </button>
          )}
          <button
            onClick={aplicar}
            disabled={applying}
            className="text-xs text-amber-700 hover:underline disabled:opacity-50"
            title="Re-aplica este margen a todos los productos comprados a este proveedor"
          >
            {applying ? '...' : 'Aplicar a productos'}
          </button>
          {applyMsg && <span className="text-xs text-green-600">{applyMsg}</span>}
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      </td>
    </tr>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function PreciosClient({
  proveedores,
  productos,
}: {
  proveedores: ProveedorSlim[]
  productos: ProductoSlim[]
}) {
  const [busqueda, setBusqueda] = useState('')

  const filtrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()),
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lista de Precios</h1>
        <p className="text-sm text-gray-500 mt-1">
          El precio de venta se calcula automáticamente usando el margen del proveedor cada vez que
          se registra una factura de compra.
        </p>
      </div>

      {/* ── Sección 1: Márgenes por proveedor ─────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Márgenes por proveedor</h2>
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="table-th">Proveedor</th>
                  <th className="table-th text-right">Margen de ganancia</th>
                  <th className="table-th">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {proveedores.map((p) => (
                  <ProveedorRow key={p.id} prov={p} />
                ))}
                {proveedores.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-sm text-gray-400">
                      No hay proveedores activos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          💡 <strong>Aplicar a productos</strong> recalcula los precios de todos los productos que se compraron
          alguna vez a ese proveedor usando el margen actual. Los cambios futuros se aplican automáticamente al
          registrar cada factura.
        </p>
      </section>

      {/* ── Sección 2: Lista de precios actual ────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800">Precios actuales por producto</h2>
          <input
            type="text"
            placeholder="Buscar producto..."
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
                  <th className="table-th">Producto</th>
                  <th className="table-th">Categoría</th>
                  <th className="table-th text-right">Costo actual</th>
                  <th className="table-th text-right">Margen aplicado</th>
                  <th className="table-th text-right">Precio de venta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrados.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td font-medium text-gray-900">{p.nombre}</td>
                    <td className="table-td">
                      <span className="badge bg-gray-100 text-gray-700">
                        {CATEGORIAS[p.categoria]} {p.categoria}
                      </span>
                    </td>
                    <td className="table-td text-right text-gray-700">{formatCurrency(p.costo_actual)}</td>
                    <td className="table-td text-right text-gray-500">{p.margen_ganancia}%</td>
                    <td className="table-td text-right font-semibold text-green-700">
                      {formatCurrency(p.precio_venta)}
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-sm text-gray-400">
                      No hay productos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
