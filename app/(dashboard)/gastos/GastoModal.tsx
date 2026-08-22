'use client'

import { useState } from 'react'
import type { CategoriaGasto } from '@/lib/supabase/types'
import { registrarGasto } from '@/lib/actions/gastos'

const MEDIOS_PAGO = ['Efectivo', 'Transferencia', 'Tarjeta débito', 'Tarjeta crédito', 'Cheque', 'Otro']

type Props = {
  categorias: CategoriaGasto[]
  onSaved: () => void
  onClose: () => void
}

export default function GastoModal({ categorias, onSaved, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await registrarGasto(new FormData(e.currentTarget))
      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar gasto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Nuevo gasto</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Categoría */}
          <div>
            <label className="label">Categoría *</label>
            <select name="categoria_id" required className="input">
              <option value="">— Seleccionar —</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          {/* Concepto */}
          <div>
            <label className="label">Concepto *</label>
            <input
              name="concepto"
              required
              className="input"
              placeholder="Descripción del gasto"
              autoFocus
            />
          </div>

          {/* Monto + Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Monto *</label>
              <input name="monto" type="number" step="0.01" min="0.01" required className="input" placeholder="0" />
            </div>
            <div>
              <label className="label">Fecha *</label>
              <input
                name="fecha"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
                className="input"
              />
            </div>
          </div>

          {/* Medio de pago */}
          <div>
            <label className="label">Medio de pago</label>
            <select name="medio_pago" className="input">
              {MEDIOS_PAGO.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Notas */}
          <div>
            <label className="label">Notas</label>
            <input name="notas" className="input" placeholder="Opcional" />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Registrando...' : 'Registrar gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
