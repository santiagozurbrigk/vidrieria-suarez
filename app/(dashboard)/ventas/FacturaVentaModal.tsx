'use client'

import { useState } from 'react'
import type { Cliente, Producto } from '@/lib/supabase/types'
import { registrarFacturaVenta } from '@/lib/actions/ventas'
import { hoy } from '@/lib/fechas'

type Item = {
  producto_id: string
  nombre: string
  unidad_medida: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  stock_actual: number
}

type ProductoSlim = Pick<Producto, 'id' | 'nombre' | 'unidad_medida' | 'precio_venta' | 'stock_actual'>
type ClienteSlim  = Pick<Cliente,  'id' | 'nombre' | 'apellido' | 'razon_social'>

type Props = {
  clientes: ClienteSlim[]
  productos: ProductoSlim[]
  onSaved: () => void
  onClose: () => void
}

const UNIDADES: Record<string, string> = { UNIDAD: 'und.', M2: 'm²', ML: 'ml' }

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

function clienteLabel(c: ClienteSlim) {
  if (c.razon_social) return c.razon_social
  return [c.nombre, c.apellido].filter(Boolean).join(' ')
}

export default function FacturaVentaModal({ clientes, productos, onSaved, onClose }: Props) {
  const [items, setItems]       = useState<Item[]>([])
  const [clienteId, setClienteId] = useState('')
  const [numero, setNumero]     = useState('')
  const [fecha, setFecha]       = useState(hoy())
  const [tipo, setTipo]         = useState('FACTURA')
  const [iva, setIva]           = useState(0)
  const [notas, setNotas]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0)
  const total    = subtotal + iva

  // ── Producto seleccionado ──────────────────────────────────────────────────
  function agregarProducto(productoId: string) {
    const p = productos.find((x) => x.id === productoId)
    if (!p || items.find((x) => x.producto_id === productoId)) return
    setItems((prev) => [
      ...prev,
      {
        producto_id:    p.id,
        nombre:         p.nombre,
        unidad_medida:  p.unidad_medida,
        cantidad:       1,
        precio_unitario: p.precio_venta,
        subtotal:       p.precio_venta,
        stock_actual:   p.stock_actual,
      },
    ])
  }

  function updateItem(idx: number, field: 'cantidad' | 'precio_unitario', value: number) {
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

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!clienteId)     { setError('Seleccioná un cliente.'); return }
    if (items.length === 0) { setError('Agregá al menos un producto.'); return }

    const sinStock = items.filter((i) => i.cantidad > i.stock_actual)
    if (sinStock.length > 0) {
      setError(`Stock insuficiente: ${sinStock.map((i) => i.nombre).join(', ')}`)
      return
    }

    setLoading(true)
    const r = await registrarFacturaVenta({
      cliente_id: clienteId,
      // Vacío ⇒ la base asigna el siguiente número correlativo.
      numero, fecha,
      tipo_comprobante: tipo,
      subtotal, iva, total, notas,
      items: items.map(({ producto_id, cantidad, precio_unitario, subtotal: st }) => ({
        producto_id, cantidad, precio_unitario, subtotal: st,
      })),
    })
    setLoading(false)
    if (!r.ok) { setError(r.error); return }
    onSaved()
  }

  const productosDisponibles = productos.filter(
    (p) => !items.find((x) => x.producto_id === p.id),
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Nueva factura de venta</h2>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          <form id="venta-form" onSubmit={handleSubmit} className="space-y-5">

            {/* Cliente */}
            <div>
              <label className="label">Cliente *</label>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                required
                className="input"
              >
                <option value="">— Seleccionar cliente —</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{clienteLabel(c)}</option>
                ))}
              </select>
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
                <label className="label">Tipo</label>
                <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="input">
                  <option value="FACTURA">Factura</option>
                  <option value="TICKET">Ticket</option>
                  <option value="NOTA_CREDITO">Nota de crédito</option>
                </select>
              </div>
            </div>

            {/* Agregar producto */}
            <div>
              <label className="label">Agregar producto</label>
              <select
                onChange={(e) => { if (e.target.value) { agregarProducto(e.target.value); e.target.value = '' } }}
                className="input"
              >
                <option value="">— Seleccionar producto —</option>
                {productosDisponibles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} · stock: {p.stock_actual} · {formatCurrency(p.precio_venta)}
                  </option>
                ))}
              </select>
            </div>

            {/* Tabla de ítems */}
            {items.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-th">Producto</th>
                      <th className="table-th text-right">Stock</th>
                      <th className="table-th text-right">Cantidad</th>
                      <th className="table-th text-right">Precio unit.</th>
                      <th className="table-th text-right">Subtotal</th>
                      <th className="table-th"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((item, idx) => {
                      const sinStock = item.cantidad > item.stock_actual
                      return (
                        <tr key={item.producto_id} className={sinStock ? 'bg-red-50' : ''}>
                          <td className="table-td font-medium">
                            {item.nombre}
                            <span className="ml-1 text-xs text-gray-400">{UNIDADES[item.unidad_medida] ?? item.unidad_medida}</span>
                          </td>
                          <td className={`table-td text-right text-xs ${sinStock ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                            {item.stock_actual}
                          </td>
                          <td className="table-td text-right">
                            <input
                              type="number" step="0.001" min="0.001"
                              value={item.cantidad}
                              onChange={(e) => updateItem(idx, 'cantidad', parseFloat(e.target.value) || 0)}
                              className={`input w-24 text-right ${sinStock ? 'border-red-400' : ''}`}
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
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totales */}
            <div className="flex justify-end">
              <div className="w-56 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span>IVA</span>
                  <input
                    type="number" step="0.01" min="0"
                    value={iva}
                    onChange={(e) => setIva(parseFloat(e.target.value) || 0)}
                    className="input w-28 text-right text-sm"
                  />
                </div>
                <div className="flex justify-between font-bold text-gray-900 border-t pt-2">
                  <span>Total</span>
                  <span className="text-green-700">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="label">Notas</label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={2}
                className="input"
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
          <button type="submit" form="venta-form" disabled={loading} className="btn-primary">
            {loading ? 'Registrando...' : 'Registrar factura'}
          </button>
        </div>
      </div>
    </div>
  )
}
