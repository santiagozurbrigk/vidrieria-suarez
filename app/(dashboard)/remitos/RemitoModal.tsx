'use client'

import { useState } from 'react'
import { crearRemito } from '@/lib/actions/remitos'
import { hoy } from '@/lib/fechas'

type ClienteSlim = { id: string; nombre: string; apellido: string | null; razon_social: string | null }
type FacturaSlim = { id: string; numero: string; cliente_id: string; total: number }
type ProductoSlim = { id: string; nombre: string; unidad_medida: string; precio_venta: number }

/**
 * Renglón del remito.
 *
 * `producto_id` vacío significa renglón libre: se escribe la descripción y el
 * importe a mano, sin pasar por el catálogo. Cuando sí viene de un producto,
 * el precio se precarga con el de lista pero queda editable — el monto lo
 * decide quien carga el remito, no la lista de precios.
 */
type Item = {
  producto_id:     string
  descripcion:     string
  unidad_medida:   string
  cantidad:        number
  precio_unitario: number
  subtotal:        number
}

type Props = {
  clientes:      ClienteSlim[]
  facturasVenta: FacturaSlim[]
  productos:     ProductoSlim[]
  onSaved:       () => void
  onClose:       () => void
}

const UNIDADES: Record<string, string> = { UNIDAD: 'und.', M2: 'm²', ML: 'ml' }

function clienteLabel(c: ClienteSlim) {
  if (c.razon_social) return c.razon_social
  return [c.nombre, c.apellido].filter(Boolean).join(' ')
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

export default function RemitoModal({ clientes, facturasVenta, productos, onSaved, onClose }: Props) {
  const [clienteId, setClienteId] = useState('')
  const [facturaId, setFacturaId] = useState('')
  const [numero,    setNumero]    = useState('')
  const [fecha,     setFecha]     = useState(hoy())
  const [notas,     setNotas]     = useState('')
  const [items,     setItems]     = useState<Item[]>([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  const facturasFiltradas = clienteId
    ? facturasVenta.filter((f) => f.cliente_id === clienteId)
    : facturasVenta

  const total = items.reduce((s, i) => s + i.subtotal, 0)

  function agregarProducto(productoId: string) {
    const p = productos.find((x) => x.id === productoId)
    if (!p) return
    setItems((prev) => [...prev, {
      producto_id:     p.id,
      descripcion:     p.nombre,
      unidad_medida:   p.unidad_medida,
      cantidad:        1,
      precio_unitario: p.precio_venta,
      subtotal:        p.precio_venta,
    }])
  }

  function agregarLibre() {
    setItems((prev) => [...prev, {
      producto_id: '', descripcion: '', unidad_medida: '',
      cantidad: 1, precio_unitario: 0, subtotal: 0,
    }])
  }

  function updateItem(idx: number, campo: 'descripcion' | 'cantidad' | 'precio_unitario', valor: string | number) {
    setItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item
      const actualizado = { ...item, [campo]: valor }
      actualizado.subtotal = Math.round(actualizado.cantidad * actualizado.precio_unitario * 100) / 100
      return actualizado
    }))
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clienteId) { setError('Seleccioná un cliente'); return }
    if (items.some((i) => !i.descripcion.trim())) {
      setError('Completá la descripción de todos los renglones.')
      return
    }

    setLoading(true)
    setError('')
    const r = await crearRemito({
      cliente_id:       clienteId,
      factura_venta_id: facturaId || null,
      // Vacío ⇒ la base asigna el siguiente número correlativo.
      numero:           numero.trim(),
      fecha,
      notas:            notas.trim(),
      items: items.map((i) => ({
        producto_id:     i.producto_id || null,
        descripcion:     i.descripcion.trim(),
        cantidad:        i.cantidad,
        precio_unitario: i.precio_unitario,
        subtotal:        i.subtotal,
      })),
    })
    setLoading(false)
    if (!r.ok) { setError(r.error); return }
    onSaved()
  }

  const productosDisponibles = productos.filter((p) => !items.find((x) => x.producto_id === p.id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Nuevo remito</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          <form id="remito-form" onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

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

            {/* ── Detalle ── */}
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Detalle <span className="text-gray-400 font-normal">(opcional)</span></label>
                <button type="button" onClick={agregarLibre} className="text-xs text-blue-600 hover:underline">
                  + Renglón libre
                </button>
              </div>

              <select
                value=""
                onChange={(e) => { if (e.target.value) agregarProducto(e.target.value) }}
                className="input mb-3"
              >
                <option value="">Agregar un producto del catálogo…</option>
                {productosDisponibles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} — {formatCurrency(p.precio_venta)}
                  </option>
                ))}
              </select>

              {items.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Sin renglones. Podés dejar el remito sólo como comprobante de entrega,
                  o agregar productos y escribir el importe que quieras.
                </p>
              ) : (
                <div className="rounded-lg border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="table-th">Descripción</th>
                        <th className="table-th text-right w-20">Cant.</th>
                        <th className="table-th text-right w-32">Precio</th>
                        <th className="table-th text-right w-28">Subtotal</th>
                        <th className="table-th w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="table-td">
                            <input
                              type="text"
                              value={item.descripcion}
                              onChange={(e) => updateItem(idx, 'descripcion', e.target.value)}
                              placeholder="Descripción del renglón"
                              className="input text-sm"
                            />
                            {item.producto_id ? (
                              <span className="text-xs text-gray-400">
                                Del catálogo{item.unidad_medida ? ` · ${UNIDADES[item.unidad_medida] ?? item.unidad_medida}` : ''}
                              </span>
                            ) : (
                              <span className="text-xs text-blue-500">Renglón libre</span>
                            )}
                          </td>
                          <td className="table-td">
                            <input
                              type="number" step="0.001" min="0.001"
                              value={item.cantidad}
                              onChange={(e) => updateItem(idx, 'cantidad', parseFloat(e.target.value) || 0)}
                              className="input w-20 text-right text-sm"
                            />
                          </td>
                          <td className="table-td">
                            <input
                              type="number" step="0.01" min="0"
                              value={item.precio_unitario}
                              onChange={(e) => updateItem(idx, 'precio_unitario', parseFloat(e.target.value) || 0)}
                              className="input w-32 text-right text-sm"
                            />
                          </td>
                          <td className="table-td text-right font-medium">{formatCurrency(item.subtotal)}</td>
                          <td className="table-td text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="text-gray-300 hover:text-red-600"
                              aria-label="Quitar renglón"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex justify-end gap-6 border-t border-gray-100 bg-gray-50 px-4 py-2 text-sm">
                    <span className="text-gray-500">Total</span>
                    <strong className="text-gray-900">{formatCurrency(total)}</strong>
                  </div>
                </div>
              )}

              <p className="mt-2 text-xs text-gray-400">
                El remito no descuenta stock: el descuento lo hace la factura de venta.
              </p>
            </div>

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
          </form>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button type="submit" form="remito-form" disabled={loading} className="btn-primary">
            {loading ? 'Creando…' : 'Crear remito'}
          </button>
        </div>
      </div>
    </div>
  )
}
