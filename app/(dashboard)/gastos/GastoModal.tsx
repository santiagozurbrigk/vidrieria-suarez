'use client'

import { useState } from 'react'
import { editarGasto } from '@/lib/actions/gastos'
import { CATEGORIAS_EGRESO, MEDIOS_PAGO, type CategoriaEgreso } from '@/lib/caja'

/**
 * Edición de un gasto ya cargado.
 *
 * No crea: los egresos nuevos entran por Caja, que es el único punto de carga de
 * plata. Acá sólo se corrige uno existente.
 */
type GastoEditable = {
  gasto_id:         string
  concepto:         string
  monto:            number
  fecha:            string
  medio_pago:       string | null
  categoria_egreso: string | null
  notas:            string | null
}

type Props = {
  gasto:   GastoEditable
  onSaved: () => void
  onClose: () => void
}

export default function GastoModal({ gasto, onSaved, onClose }: Props) {
  const [categoria, setCategoria] = useState<CategoriaEgreso>(
    (gasto.categoria_egreso as CategoriaEgreso | null) ?? 'VARIOS',
  )
  const [concepto, setConcepto]   = useState(gasto.concepto)
  const [monto, setMonto]         = useState(String(gasto.monto))
  // `fecha` llega como timestamptz de la vista; el input necesita YYYY-MM-DD.
  const [fecha, setFecha]         = useState(gasto.fecha.slice(0, 10))
  const [medioPago, setMedioPago] = useState(gasto.medio_pago ?? 'Efectivo')
  const [notas, setNotas]         = useState(gasto.notas ?? '')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const r = await editarGasto(gasto.gasto_id, {
      categoria_egreso: categoria,
      concepto,
      monto,
      medio_pago: medioPago,
      fecha,
      notas,
    })
    setLoading(false)
    if (!r.ok) { setError(r.error); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900">Editar egreso</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="label">Categoría *</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIAS_EGRESO.map((c) => (
                <button
                  key={c.valor}
                  type="button"
                  onClick={() => setCategoria(c.valor)}
                  className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                    categoria === c.valor
                      ? 'border-red-600 bg-red-600 text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Detalle *</label>
            <input
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              required
              className="input"
              placeholder="Descripción del egreso"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Monto *</label>
              <input
                type="number" step="0.01" min="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required
                className="input"
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

          <div>
            <label className="label">Medio de pago</label>
            <select value={medioPago} onChange={(e) => setMedioPago(e.target.value)} className="input">
              {MEDIOS_PAGO.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Notas</label>
            <input value={notas} onChange={(e) => setNotas(e.target.value)} className="input" />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
