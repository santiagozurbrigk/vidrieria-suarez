'use client'

import { useState } from 'react'
import { registrarAjusteCaja } from '@/lib/actions/caja'
import { hoy } from '@/lib/fechas'

// Este modal queda sólo para el ajuste por diferencia de conteo. Los ingresos y
// egresos se cargan desde "+ Nuevo movimiento", que les pide categoría: un egreso
// sin categoría aparecería como "Sin categoría" en Gastos.

type Props = {
  onSaved: () => void
  onClose: () => void
}

export default function AjusteModal({ onSaved, onClose }: Props) {
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto]       = useState<number | ''>('')
  const [fecha, setFecha]       = useState(hoy())
  const [notas, setNotas]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!concepto.trim()) { setError('Ingresá el concepto.'); return }
    if (!monto || monto <= 0) { setError('Ingresá el monto.'); return }

    setLoading(true)
    const r = await registrarAjusteCaja({
      tipo: 'AJUSTE',
      concepto: concepto.trim(),
      monto: typeof monto === 'number' ? monto : parseFloat(monto),
      medio_pago: null,
      fecha,
      notas: notas || null,
    })
    setLoading(false)
    if (!r.ok) { setError(r.error); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Ajuste de caja</h2>
          <p className="mt-1 text-sm text-gray-500">
            Sólo para corregir una diferencia de conteo. Para cargar una venta o un
            gasto usá <strong>+ Nuevo movimiento</strong>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Concepto */}
          <div>
            <label className="label">Concepto *</label>
            <input
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              required
              className="input"
              placeholder="Diferencia de conteo del cierre…"
            />
          </div>

          {/* Monto + Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Monto *</label>
              <input
                type="number" step="0.01" min="0.01"
                value={monto}
                onChange={(e) => setMonto(parseFloat(e.target.value) || '')}
                required
                className="input"
                placeholder="0"
              />
            </div>
            <div>
              <label className="label">Fecha *</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="input"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="label">Notas</label>
            <input
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="input"
              placeholder="Opcional"
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
