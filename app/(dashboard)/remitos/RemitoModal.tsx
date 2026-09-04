'use client'

import { useState } from 'react'
import { crearRemito } from '@/lib/actions/remitos'

type ClienteSlim = { id: string; nombre: string; apellido: string | null; razon_social: string | null }
type FacturaSlim = { id: string; numero: string; cliente_id: string; total: number }

type Props = {
  clientes:      ClienteSlim[]
  facturasVenta: FacturaSlim[]
  onSaved:       () => void
  onClose:       () => void
}

function clienteLabel(c: ClienteSlim) {
  if (c.razon_social) return c.razon_social
  return [c.nombre, c.apellido].filter(Boolean).join(' ')
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

export default function RemitoModal({ clientes, facturasVenta, onSaved, onClose }: Props) {
  const hoy = new Date().toISOString().split('T')[0]

  const [clienteId,      setClienteId]      = useState('')
  const [facturaId,      setFacturaId]      = useState('')
  const [numero,         setNumero]         = useState('')
  const [fecha,          setFecha]          = useState(hoy)
  const [notas,          setNotas]          = useState('')
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState('')

  // Filter invoices to selected client
  const facturasFiltradas = clienteId
    ? facturasVenta.filter((f) => f.cliente_id === clienteId)
    : facturasVenta

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clienteId) { setError('Seleccioná un cliente'); return }

    setLoading(true)
    setError('')
    const r = await crearRemito({
      cliente_id:       clienteId,
      factura_venta_id: facturaId || null,
      // Vacío ⇒ la base asigna el siguiente número correlativo.
      numero:           numero.trim(),
      fecha,
      notas:            notas.trim(),
    })
    setLoading(false)
    if (!r.ok) { setError(r.error); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Nuevo remito</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {/* Numero + Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Número de remito</label>
              <input
                type="text"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Automático"
                className="input"
              />
            </div>
            <div>
              <label className="label">Fecha *</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="input"
                required
              />
            </div>
          </div>

          {/* Cliente */}
          <div>
            <label className="label">Cliente *</label>
            <select
              value={clienteId}
              onChange={(e) => { setClienteId(e.target.value); setFacturaId('') }}
              className="input"
              required
            >
              <option value="">Seleccioná un cliente…</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{clienteLabel(c)}</option>
              ))}
            </select>
          </div>

          {/* Factura vinculada (opcional) */}
          <div>
            <label className="label">Factura vinculada <span className="text-gray-400 font-normal">(opcional)</span></label>
            <select
              value={facturaId}
              onChange={(e) => setFacturaId(e.target.value)}
              className="input"
              disabled={!clienteId}
            >
              <option value="">Sin factura asociada</option>
              {facturasFiltradas.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.numero} — {formatCurrency(f.total)}
                </option>
              ))}
            </select>
            {clienteId && facturasFiltradas.length === 0 && (
              <p className="mt-1 text-xs text-gray-400">Este cliente no tiene facturas registradas.</p>
            )}
          </div>

          {/* Notas */}
          <div>
            <label className="label">Notas <span className="text-gray-400 font-normal">(opcional)</span></label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder="Observaciones del remito…"
              className="input resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Creando…' : 'Crear remito'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
