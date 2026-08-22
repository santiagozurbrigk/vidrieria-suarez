'use client'

import { useState } from 'react'
import { registrarAjusteCaja } from '@/lib/actions/caja'

type Tipo = 'INGRESO' | 'EGRESO' | 'AJUSTE'

const MEDIOS_PAGO = ['Efectivo', 'Transferencia', 'Cheque', 'Tarjeta débito', 'Tarjeta crédito', 'Otro']

type Props = {
  onSaved: () => void
  onClose: () => void
}

export default function AjusteModal({ onSaved, onClose }: Props) {
  const [tipo, setTipo]         = useState<Tipo>('INGRESO')
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto]       = useState<number | ''>('')
  const [medioPago, setMedioPago] = useState('Efectivo')
  const [fecha, setFecha]       = useState(new Date().toISOString().slice(0, 10))
  const [notas, setNotas]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!concepto.trim()) { setError('Ingresá el concepto.'); return }
    if (!monto || monto <= 0) { setError('Ingresá el monto.'); return }

    setLoading(true)
    try {
      await registrarAjusteCaja({
        tipo, concepto: concepto.trim(),
        monto: typeof monto === 'number' ? monto : parseFloat(monto),
        medio_pago: tipo === 'AJUSTE' ? null : medioPago,
        fecha,
        notas: notas || null,
      })
      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Ajuste manual de caja</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tipo */}
          <div>
            <label className="label">Tipo *</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              {(['INGRESO', 'EGRESO', 'AJUSTE'] as Tipo[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`flex-1 py-2 font-medium transition-colors ${
                    tipo === t
                      ? t === 'INGRESO' ? 'bg-green-600 text-white'
                        : t === 'EGRESO' ? 'bg-red-600 text-white'
                        : 'bg-gray-700 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {t === 'INGRESO' ? '↑ Ingreso' : t === 'EGRESO' ? '↓ Egreso' : '↕ Ajuste'}
                </button>
              ))}
            </div>
          </div>

          {/* Concepto */}
          <div>
            <label className="label">Concepto *</label>
            <input
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              required
              className="input"
              placeholder={
                tipo === 'INGRESO' ? 'Aporte de capital, venta en efectivo...'
                : tipo === 'EGRESO' ? 'Retiro de caja, compra urgente...'
                : 'Ajuste por diferencia de inventario...'
              }
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

          {/* Medio de pago (no aplica para AJUSTE) */}
          {tipo !== 'AJUSTE' && (
            <div>
              <label className="label">Medio de pago</label>
              <select value={medioPago} onChange={(e) => setMedioPago(e.target.value)} className="input">
                {MEDIOS_PAGO.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}

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
