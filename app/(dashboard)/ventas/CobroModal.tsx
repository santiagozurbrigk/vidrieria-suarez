'use client'

import { useState } from 'react'
import { registrarCobroVenta } from '@/lib/actions/ventas'

type Props = {
  factura: {
    id: string
    numero: string
    saldo_pendiente: number
    clientes: { nombre: string; apellido: string | null; razon_social: string | null } | null
  }
  onSaved: () => void
  onClose:  () => void
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

export default function CobroModal({ factura, onSaved, onClose }: Props) {
  const [monto,     setMonto]     = useState(factura.saldo_pendiente)
  const [medioPago, setMedioPago] = useState('EFECTIVO')
  const [fecha,     setFecha]     = useState(new Date().toISOString().slice(0, 10))
  const [notas,     setNotas]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const cli = factura.clientes
  const clienteLabel = cli
    ? (cli.razon_social ?? [cli.nombre, cli.apellido].filter(Boolean).join(' '))
    : '—'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await registrarCobroVenta({
        factura_id: factura.id,
        monto,
        medio_pago: medioPago,
        fecha,
        notas: notas || undefined,
      })
      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar cobro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Registrar cobro</h2>
        <p className="text-sm text-gray-500 mb-4">
          Factura <span className="font-mono font-medium">{factura.numero}</span> · {clienteLabel}
        </p>

        <div className="mb-4 flex items-center justify-between rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-sm text-orange-700">
          <span>Saldo pendiente</span>
          <strong>{formatCurrency(factura.saldo_pendiente)}</strong>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Monto cobrado *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={factura.saldo_pendiente}
              value={monto}
              onChange={(e) => setMonto(parseFloat(e.target.value) || 0)}
              required
              className="input"
              autoFocus
            />
          </div>

          <div>
            <label className="label">Medio de pago *</label>
            <select value={medioPago} onChange={(e) => setMedioPago(e.target.value)} className="input">
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="CHEQUE">Cheque</option>
              <option value="OTRO">Otro</option>
            </select>
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

          <div>
            <label className="label">Notas</label>
            <input
              type="text"
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
              {loading ? 'Registrando...' : 'Confirmar cobro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
