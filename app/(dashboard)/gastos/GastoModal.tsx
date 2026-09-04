'use client'

import { useState } from 'react'
import type { CategoriaGasto, Gasto } from '@/lib/supabase/types'
import { registrarGasto, editarGasto } from '@/lib/actions/gastos'
import { hoy } from '@/lib/fechas'

const MEDIOS_PAGO = ['Efectivo', 'Transferencia', 'Tarjeta débito', 'Tarjeta crédito', 'Cheque', 'Otro']

type Props = {
  categorias: CategoriaGasto[]
  gasto?:     Gasto | null      // null/undefined = create mode
  onSaved: () => void
  onClose: () => void
}

export default function GastoModal({ categorias, gasto, onSaved, onClose }: Props) {
  const isEdit = !!gasto

  const [categoriaId, setCategoriaId] = useState(gasto?.categoria_id ?? '')
  const [concepto,    setConcepto]    = useState(gasto?.concepto ?? '')
  const [monto,       setMonto]       = useState(gasto?.monto?.toString() ?? '')
  const [fecha,       setFecha]       = useState(gasto?.fecha ?? hoy())
  const [medioPago,   setMedioPago]   = useState(gasto?.medio_pago ?? 'Efectivo')
  const [notas,       setNotas]       = useState(gasto?.notas ?? '')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const payload = { categoria_id: categoriaId, concepto, monto, medio_pago: medioPago, fecha, notas }
    const r = isEdit
      ? await editarGasto(gasto!.id, payload)
      : await registrarGasto(payload)
    setLoading(false)
    if (!r.ok) { setError(r.error); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Editar gasto' : 'Nuevo gasto'}</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Categoría */}
          <div>
            <label className="label">Categoría *</label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              required
              className="input"
            >
              <option value="">— Seleccionar —</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          {/* Concepto */}
          <div>
            <label className="label">Concepto *</label>
            <input
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              required
              className="input"
              placeholder="Descripción del gasto"
              autoFocus={!isEdit}
            />
          </div>

          {/* Monto + Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Monto *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
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

          {/* Medio de pago */}
          <div>
            <label className="label">Medio de pago</label>
            <select value={medioPago} onChange={(e) => setMedioPago(e.target.value)} className="input">
              {MEDIOS_PAGO.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
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
              {loading ? (isEdit ? 'Guardando…' : 'Registrando…') : (isEdit ? 'Guardar cambios' : 'Registrar gasto')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
