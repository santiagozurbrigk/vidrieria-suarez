'use client'

import { useState } from 'react'
import type { Arquitecto, Cliente, Producto } from '@/lib/supabase/types'
import { crearPresupuesto } from '@/lib/actions/presupuestos'
import { hoy } from '@/lib/fechas'

type Item = {
  producto_id: string | null
  descripcion: string
  cantidad: number
  precio_unitario: number
  subtotal: number
}

type ArquitectoSlim = Pick<Arquitecto, 'id' | 'nombre' | 'apellido' | 'estudio'>
type ClienteSlim    = Pick<Cliente,    'id' | 'nombre' | 'apellido' | 'razon_social'>
type ProductoSlim   = Pick<Producto,   'id' | 'nombre' | 'unidad_medida' | 'precio_venta'>

type Props = {
  arquitectos: ArquitectoSlim[]
  clientes:    ClienteSlim[]
  productos:   ProductoSlim[]
  onSaved: () => void
  onClose: () => void
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

function arquitectoLabel(a: ArquitectoSlim) {
  const nombre = [a.nombre, a.apellido].filter(Boolean).join(' ')
  return a.estudio ? `${nombre} (${a.estudio})` : nombre
}

function clienteLabel(c: ClienteSlim) {
  if (c.razon_social) return c.razon_social
  return [c.nombre, c.apellido].filter(Boolean).join(' ')
}

export default function PresupuestoModal({ arquitectos, clientes, productos, onSaved, onClose }: Props) {
  const [arquitectoId, setArquitectoId] = useState('')
  const [clienteId, setClienteId]       = useState('')
  const [obra, setObra]                 = useState('')
  const [numero, setNumero]             = useState('')
  const [fecha, setFecha]               = useState(hoy())
  const [validezDias, setValidezDias]   = useState(30)
  const [notas, setNotas]               = useState('')
  const [items, setItems]               = useState<Item[]>([])
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)

  const total = items.reduce((s, i) => s + i.subtotal, 0)

  // ── Agregar desde catálogo ──────────────────────────────────────────────────
  function agregarProducto(productoId: string) {
    const p = productos.find((x) => x.id === productoId)
    if (!p || items.find((x) => x.producto_id === productoId)) return
    setItems((prev) => [
      ...prev,
      {
        producto_id:    p.id,
        descripcion:    p.nombre,
        cantidad:       1,
        precio_unitario: p.precio_venta,
        subtotal:       p.precio_venta,
      },
    ])
  }

  // ── Agregar línea libre ─────────────────────────────────────────────────────
  function agregarLineaLibre() {
    setItems((prev) => [
      ...prev,
      { producto_id: null, descripcion: '', cantidad: 1, precio_unitario: 0, subtotal: 0 },
    ])
  }

  // ── Actualizar ítem ─────────────────────────────────────────────────────────
  function updateItem(idx: number, field: keyof Item, value: string | number | null) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item
        const updated = { ...item, [field]: value }
        updated.subtotal = updated.cantidad * updated.precio_unitario
        return updated
      }),
    )
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!arquitectoId) { setError('Seleccioná un arquitecto.'); return }
    if (items.length === 0) { setError('Agregá al menos un ítem.'); return }
    const emptyDesc = items.find((i) => !i.descripcion.trim())
    if (emptyDesc) { setError('Todos los ítems deben tener descripción.'); return }

    setLoading(true)
    const r = await crearPresupuesto({
      arquitecto_id: arquitectoId,
      cliente_id:    clienteId || null,
      obra:          obra || null,
      // Vacío ⇒ la base asigna el siguiente número correlativo.
      numero, fecha,
      validez_dias:  validezDias,
      notas:         notas || null,
      items,
    })
    setLoading(false)
    if (!r.ok) { setError(r.error); return }
    onSaved()
  }

  const productosDisponibles = productos.filter((p) => !items.find((x) => x.producto_id === p.id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Nuevo presupuesto</h2>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          <form id="presupuesto-form" onSubmit={handleSubmit} className="space-y-5">

            {/* Arquitecto */}
            <div>
              <label className="label">Arquitecto *</label>
              <select
                value={arquitectoId}
                onChange={(e) => setArquitectoId(e.target.value)}
                required
                className="input"
              >
                <option value="">— Seleccionar arquitecto —</option>
                {arquitectos.map((a) => (
                  <option key={a.id} value={a.id}>{arquitectoLabel(a)}</option>
                ))}
              </select>
            </div>

            {/* Cliente + Obra */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Cliente (opcional)</label>
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className="input"
                >
                  <option value="">— Sin cliente —</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{clienteLabel(c)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Obra / proyecto</label>
                <input
                  value={obra}
                  onChange={(e) => setObra(e.target.value)}
                  className="input"
                  placeholder="Nombre del proyecto"
                />
              </div>
            </div>

            {/* Cabecera */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Número</label>
                <input
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  className="input"
                  placeholder="Automático"
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
              <div>
                <label className="label">Validez (días)</label>
                <input
                  type="number"
                  min="1"
                  value={validezDias}
                  onChange={(e) => setValidezDias(parseInt(e.target.value) || 30)}
                  className="input"
                />
              </div>
            </div>

            {/* Agregar ítems */}
            <div>
              <label className="label">Agregar producto del catálogo</label>
              <select
                onChange={(e) => { if (e.target.value) { agregarProducto(e.target.value); e.target.value = '' } }}
                className="input"
              >
                <option value="">— Seleccionar producto —</option>
                {productosDisponibles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} · {formatCurrency(p.precio_venta)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={agregarLineaLibre}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                + Agregar línea libre
              </button>
            </div>

            {/* Tabla de ítems */}
            {items.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-th">Descripción</th>
                      <th className="table-th text-right">Cantidad</th>
                      <th className="table-th text-right">Precio unit.</th>
                      <th className="table-th text-right">Subtotal</th>
                      <th className="table-th"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="table-td">
                          <input
                            value={item.descripcion}
                            onChange={(e) => updateItem(idx, 'descripcion', e.target.value)}
                            className="input w-full text-sm"
                            placeholder="Descripción del ítem"
                          />
                        </td>
                        <td className="table-td text-right">
                          <input
                            type="number" step="0.001" min="0.001"
                            value={item.cantidad}
                            onChange={(e) => updateItem(idx, 'cantidad', parseFloat(e.target.value) || 0)}
                            className="input w-20 text-right"
                          />
                        </td>
                        <td className="table-td text-right">
                          <input
                            type="number" step="0.01" min="0"
                            value={item.precio_unitario}
                            onChange={(e) => updateItem(idx, 'precio_unitario', parseFloat(e.target.value) || 0)}
                            className="input w-28 text-right"
                          />
                        </td>
                        <td className="table-td text-right font-medium">{formatCurrency(item.subtotal)}</td>
                        <td className="table-td">
                          <button type="button" onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700 text-xs">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Total */}
            {items.length > 0 && (
              <div className="flex justify-end">
                <div className="w-48 space-y-2 text-sm">
                  <div className="flex justify-between font-bold text-gray-900 border-t pt-2">
                    <span>Total</span>
                    <span className="text-green-700">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Notas */}
            <div>
              <label className="label">Notas / condiciones</label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={2}
                className="input"
                placeholder="Condiciones de pago, entrega, etc."
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" form="presupuesto-form" disabled={loading} className="btn-primary">
            {loading ? 'Guardando...' : 'Crear presupuesto'}
          </button>
        </div>
      </div>
    </div>
  )
}
