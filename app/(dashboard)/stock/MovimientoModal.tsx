'use client'

import { useState } from 'react'
import type { Producto } from '@/lib/supabase/types'
import { registrarMovimiento } from '@/lib/actions/stock'

type Props = {
  producto: Producto
  onSaved: (p: Producto) => void
  onClose: () => void
}

type Tipo = 'ENTRADA' | 'SALIDA' | 'AJUSTE'

const UNIDADES = { UNIDAD: 'und.', M2: 'm²', ML: 'ml' }

export default function MovimientoModal({ producto, onSaved, onClose }: Props) {
  const [tipo, setTipo] = useState<Tipo>('ENTRADA')
  const [cantidad, setCantidad] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const unidad = UNIDADES[producto.unidad_medida]
  const esAjuste = tipo === 'AJUSTE'
  const valor = parseFloat(cantidad)

  // En un ajuste la cantidad es el stock contado, no un delta: se muestra el
  // resultado para que quede claro que puede bajar el stock, no sólo subirlo.
  const resultado = Number.isFinite(valor)
    ? esAjuste ? valor
      : tipo === 'ENTRADA' ? producto.stock_actual + valor
      : producto.stock_actual - valor
    : null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const r = await registrarMovimiento(producto.id, fd)
    setLoading(false)
    if (!r.ok) { setError(r.error); return }
    onSaved(r.data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-bold text-gray-900">Registrar movimiento</h2>
        <p className="mb-5 text-sm text-gray-500">
          {producto.nombre} — Stock actual: <strong>{producto.stock_actual} {unidad}</strong>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Tipo *</label>
            <select
              name="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as Tipo)}
              required
              className="input"
            >
              <option value="ENTRADA">Entrada (suma al stock)</option>
              <option value="SALIDA">Salida (resta del stock)</option>
              <option value="AJUSTE">Ajuste por conteo (deja el stock en…)</option>
            </select>
          </div>
          <div>
            <label className="label">{esAjuste ? 'Stock contado *' : 'Cantidad *'}</label>
            <input
              name="cantidad"
              type="number"
              step="0.001"
              min={esAjuste ? '0' : '0.001'}
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              required
              className="input"
              placeholder={esAjuste ? `lo que contaste, en ${unidad}` : `en ${unidad}`}
            />
            {esAjuste && (
              <p className="mt-1 text-xs text-gray-500">
                Escribí cuánto hay realmente. El stock queda en ese número, suba o baje.
              </p>
            )}
            {resultado !== null && (
              resultado < 0 ? (
                <p className="mt-1 text-xs text-red-600">
                  No hay stock suficiente para esta salida.
                </p>
              ) : (
                <p className="mt-1 text-xs text-gray-500">
                  El stock queda en <strong>{resultado} {unidad}</strong>.
                </p>
              )
            )}
          </div>
          <div>
            <label className="label">Motivo</label>
            <input
              name="motivo"
              className="input"
              placeholder={esAjuste ? 'Conteo de depósito, rotura, etc.' : 'Compra, devolución, etc.'}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
