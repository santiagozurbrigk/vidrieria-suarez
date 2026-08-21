'use client'

import { useState } from 'react'
import type { Proveedor, Producto } from '@/lib/supabase/types'
import { registrarFacturaCompra } from '@/lib/actions/proveedores'

type Item = {
  producto_id: string
  nombre: string
  unidad_medida: string
  cantidad: number
  costo_unitario: number
  subtotal: number
}

type Props = {
  proveedor: Proveedor
  productos: Pick<Producto, 'id' | 'nombre' | 'unidad_medida' | 'costo_actual'>[]
  onSaved: () => void
  onClose: () => void
}

const UNIDADES: Record<string, string> = { UNIDAD: 'und.', M2: 'm²', ML: 'ml' }

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

export default function FacturaCompraModal({ proveedor, productos, onSaved, onClose }: Props) {
  const [items, setItems] = useState<Item[]>([])
  const [iva, setIva] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0)
  const total = subtotal + iva

  function agregarItem(productoId: string) {
    const p = productos.find((x) => x.id === productoId)
    if (!p || items.find((x) => x.producto_id === productoId)) return
    setItems((prev) => [...prev, {
      producto_id: p.id,
      nombre: p.nombre,
      unidad_medida: p.unidad_medida,
      cantidad: 1,
      costo_unitario: p.costo_actual,
      subtotal: p.costo_actual,
    }])
  }

  function updateItem(idx: number, field: 'cantidad' | 'costo_unitario', value: number) {
    setItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: value }
      updated.subtotal = updated.cantidad * updated.costo_unitario
      return updated
    }))
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (items.length === 0) { setError('Agregue al menos un producto.'); return }
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    try {
      await registrarFacturaCompra({
        proveedor_id: proveedor.id,
        numero: fd.get('numero') as string,
        fecha: fd.get('fecha') as string,
        tipo_comprobante: fd.get('tipo_comprobante') as string,
        subtotal,
        iva,
        total,
        notas: fd.get('notas') as string,
        items,
      })
      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar factura')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Nueva factura de compra</h2>
          <p className="text-sm text-gray-500 mt-1">Proveedor: <strong>{proveedor.razon_social}</strong></p>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          <form id="factura-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Encabezado factura */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Número *</label>
                <input name="numero" required className="input" placeholder="0001-00001234" />
              </div>
              <div>
                <label className="label">Fecha *</label>
                <input name="fecha" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
              </div>
              <div>
                <label className="label">Tipo comprobante</label>
                <select name="tipo_comprobante" className="input">
                  <option value="FACTURA">Factura</option>
                  <option value="REMITO">Remito</option>
                  <option value="TICKET">Ticket</option>
                  <option value="NOTA_CREDITO">Nota de crédito</option>
                </select>
              </div>
            </div>

            {/* Agregar producto */}
            <div>
              <label className="label">Agregar producto</label>
              <select
                onChange={(e) => { if (e.target.value) { agregarItem(e.target.value); e.target.value = '' } }}
                className="input"
              >
                <option value="">— Seleccionar producto —</option>
                {productos
                  .filter((p) => !items.find((x) => x.producto_id === p.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
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
                      <th className="table-th text-right">Cantidad</th>
                      <th className="table-th text-right">Costo unit.</th>
                      <th className="table-th text-right">Subtotal</th>
                      <th className="table-th"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((item, idx) => (
                      <tr key={item.producto_id}>
                        <td className="table-td font-medium">{item.nombre}</td>
                        <td className="table-td text-right">
                          <input
                            type="number" step="0.001" min="0.001"
                            value={item.cantidad}
                            onChange={(e) => updateItem(idx, 'cantidad', parseFloat(e.target.value) || 0)}
                            className="input w-24 text-right"
                          />
                        </td>
                        <td className="table-td text-right">
                          <input
                            type="number" step="0.01" min="0"
                            value={item.costo_unitario}
                            onChange={(e) => updateItem(idx, 'costo_unitario', parseFloat(e.target.value) || 0)}
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
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="label">Notas</label>
              <textarea name="notas" rows={2} className="input" />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>
            )}
          </form>
        </div>

        <div className="border-t border-gray-100 p-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" form="factura-form" disabled={loading} className="btn-primary">
            {loading ? 'Registrando...' : 'Registrar factura'}
          </button>
        </div>
      </div>
    </div>
  )
}
