'use client'

import { useState } from 'react'
import type { Producto } from '@/lib/supabase/types'
import { registrarMovimiento } from '@/lib/actions/stock'

type Props = {
  producto: Producto
  onSaved: (p: Producto) => void
  onClose: () => void
}

const UNIDADES = { UNIDAD: 'und.', M2: 'm²', ML: 'ml' }

export default function MovimientoModal({ producto, onSaved, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          {producto.nombre} — Stock actual:{' '}
          <strong>{producto.stock_actual} {UNIDADES[producto.unidad_medida]}</strong>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Tipo *</label>
            <select name="tipo" required className="input">
              <option value="ENTRADA">Entrada (+)</option>
              <option value="SALIDA">Salida (−)</option>
              <option value="AJUSTE">Ajuste</option>
            </select>
          </div>
          <div>
            <label className="label">Cantidad *</label>
            <input
              name="cantidad"
              type="number"
              step="0.001"
              min="0.001"
              required
              className="input"
              placeholder={`en ${UNIDADES[producto.unidad_medida]}`}
            />
          </div>
          <div>
            <label className="label">Motivo</label>
            <input name="motivo" className="input" placeholder="Ajuste manual, rotura, etc." />
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
