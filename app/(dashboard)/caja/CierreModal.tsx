'use client'

import { useState } from 'react'
import { registrarCierreCaja } from '@/lib/actions/caja'

type Props = {
  saldoSistema: number
  onSaved: () => void
  onClose: () => void
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

export default function CierreModal({ saldoSistema, onSaved, onClose }: Props) {
  const [fecha, setFecha]         = useState(new Date().toISOString().slice(0, 10))
  const [saldoReal, setSaldoReal] = useState<number | ''>('')
  const [notas, setNotas]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const saldoRealNum = typeof saldoReal === 'number' ? saldoReal : 0
  const diferencia   = saldoRealNum - saldoSistema
  const mostrarDif   = typeof saldoReal === 'number'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (typeof saldoReal !== 'number') { setError('Ingresá el saldo real.'); return }

    setLoading(true)
    try {
      await registrarCierreCaja({
        fecha,
        saldo_sistema: saldoSistema,
        saldo_real:    saldoReal,
        notas:         notas || null,
      })
      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar cierre')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Registrar cierre de caja</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Saldo sistema (read-only) */}
          <div className="rounded-xl bg-gray-50 p-4 flex justify-between items-center">
            <span className="text-sm text-gray-600 font-medium">Saldo sistema</span>
            <span className="text-lg font-bold text-gray-900">{formatCurrency(saldoSistema)}</span>
          </div>

          {/* Fecha */}
          <div>
            <label className="label">Fecha del cierre *</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
              className="input"
            />
          </div>

          {/* Saldo real */}
          <div>
            <label className="label">Saldo real (conteo físico) *</label>
            <input
              type="number" step="0.01" min="0"
              value={saldoReal}
              onChange={(e) => setSaldoReal(parseFloat(e.target.value) !== undefined && e.target.value !== '' ? parseFloat(e.target.value) : '')}
              required
              className="input text-lg font-semibold"
              placeholder="0"
              autoFocus
            />
          </div>

          {/* Diferencia calculada */}
          {mostrarDif && (
            <div className={`rounded-xl p-4 flex justify-between items-center ${
              diferencia === 0 ? 'bg-green-50' : diferencia > 0 ? 'bg-blue-50' : 'bg-red-50'
            }`}>
              <span className="text-sm font-medium text-gray-700">Diferencia</span>
              <span className={`text-lg font-bold ${
                diferencia === 0 ? 'text-green-700' : diferencia > 0 ? 'text-blue-700' : 'text-red-700'
              }`}>
                {diferencia >= 0 ? '+' : ''}{formatCurrency(diferencia)}
                {diferencia === 0 && <span className="ml-1 text-sm">✓ Cuadra</span>}
                {diferencia > 0  && <span className="ml-1 text-sm font-normal text-blue-600">Sobrante</span>}
                {diferencia < 0  && <span className="ml-1 text-sm font-normal text-red-600">Faltante</span>}
              </span>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="label">Notas</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              className="input"
              placeholder="Observaciones del cierre..."
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Registrando...' : 'Registrar cierre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
