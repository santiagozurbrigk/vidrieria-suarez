'use client'

import { useRef, useState } from 'react'
import type { Proveedor, Producto } from '@/lib/supabase/types'
import { registrarFacturaCompra } from '@/lib/actions/proveedores'
import { extraerFacturaDesdeArchivo, type ItemExtraido } from '@/lib/actions/extraerFactura'

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

/** Find best-matching product by name (simple lowercase includes) */
function matchProduct(
  nombre: string,
  productos: Pick<Producto, 'id' | 'nombre' | 'unidad_medida' | 'costo_actual'>[],
) {
  const q = nombre.toLowerCase()
  return (
    productos.find((p) => p.nombre.toLowerCase() === q) ??
    productos.find((p) => p.nombre.toLowerCase().includes(q) || q.includes(p.nombre.toLowerCase()))
  )
}

// ────────────────────────────────────────────────────────────────
// Sub-component: panel with unmatched extracted items
// ────────────────────────────────────────────────────────────────
type SuggestionPanelProps = {
  sugeridos: ItemExtraido[]
  productos: Pick<Producto, 'id' | 'nombre' | 'unidad_medida' | 'costo_actual'>[]
  currentItems: Item[]
  onAgregar: (item: Item) => void
}

function SuggestionPanel({ sugeridos, productos, currentItems, onAgregar }: SuggestionPanelProps) {
  // Local state per suggestion: selected product id override
  const [selects, setSelects] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      sugeridos.map((s, i) => {
        const match = matchProduct(s.nombre, productos)
        return [i, match?.id ?? '']
      }),
    ),
  )

  const pendientes = sugeridos.filter((_, i) => {
    const pid = selects[i]
    return pid && !currentItems.find((x) => x.producto_id === pid)
  })

  if (pendientes.length === 0 && sugeridos.length > 0) return null

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
        Ítems detectados por IA — asociá cada uno a un producto
      </p>
      {sugeridos.map((s, i) => {
        const pid = selects[i]
        const yaAgregado = !!pid && !!currentItems.find((x) => x.producto_id === pid)
        const prod = productos.find((p) => p.id === pid)

        return (
          <div key={i} className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-blue-800 flex-shrink-0 w-36 truncate" title={s.nombre}>
              {s.nombre}
            </span>
            <select
              value={pid}
              onChange={(e) => setSelects((prev) => ({ ...prev, [i]: e.target.value }))}
              className="input text-xs flex-1 min-w-0"
              disabled={yaAgregado}
            >
              <option value="">— sin coincidencia —</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={!pid || yaAgregado}
              onClick={() => {
                if (!prod) return
                onAgregar({
                  producto_id: prod.id,
                  nombre: prod.nombre,
                  unidad_medida: prod.unidad_medida,
                  cantidad: s.cantidad,
                  costo_unitario: s.costo_unitario,
                  subtotal: s.cantidad * s.costo_unitario,
                })
              }}
              className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition
                ${yaAgregado
                  ? 'bg-green-100 text-green-700 cursor-default'
                  : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40'}`}
            >
              {yaAgregado ? '✓ Agregado' : 'Agregar'}
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// Main modal
// ────────────────────────────────────────────────────────────────
export default function FacturaCompraModal({ proveedor, productos, onSaved, onClose }: Props) {
  const [items, setItems] = useState<Item[]>([])
  const [iva, setIva] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // AI extraction state
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [sugeridos, setSugeridos] = useState<ItemExtraido[] | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  // Controlled header fields (so IA can pre-fill them)
  const [numero, setNumero] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [tipoComprobante, setTipoComprobante] = useState('FACTURA')
  const [notas, setNotas] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0)
  const total = subtotal + iva

  // ── AI extraction ──
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
    if (!allowed.includes(file.type)) {
      setExtractError('Formato no soportado. Usá JPG, PNG, WEBP o PDF.')
      return
    }

    setFileName(file.name)
    setExtractError(null)
    setExtracting(true)
    setSugeridos(null)

    const fd = new FormData()
    fd.append('archivo', file)
    const result = await extraerFacturaDesdeArchivo(fd)

    if (!result.ok) {
      setExtractError(result.error)
      setExtracting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const data = result.data
    try {
      // Pre-fill header fields
      if (data.numero) setNumero(data.numero)
      if (data.fecha) setFecha(data.fecha)
      if (data.tipo_comprobante) setTipoComprobante(data.tipo_comprobante)
      if (data.iva != null) setIva(data.iva)
      if (data.notas) setNotas(data.notas)

      setSugeridos(data.items ?? [])
    } catch (err: unknown) {
      setExtractError(err instanceof Error ? err.message : 'Error al procesar el archivo')
    } finally {
      setExtracting(false)

      // Reset input so same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Manual item management ──
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

  function agregarItemDesdeIA(item: Item) {
    if (items.find((x) => x.producto_id === item.producto_id)) return
    setItems((prev) => [...prev, item])
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

  // ── Submit ──
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (items.length === 0) { setError('Agregá al menos un producto.'); return }
    setLoading(true)
    try {
      await registrarFacturaCompra({
        proveedor_id: proveedor.id,
        numero,
        fecha,
        tipo_comprobante: tipoComprobante,
        subtotal,
        iva,
        total,
        notas,
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

        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Nueva factura de compra</h2>
          <p className="text-sm text-gray-500 mt-1">Proveedor: <strong>{proveedor.razon_social}</strong></p>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          <form id="factura-form" onSubmit={handleSubmit} className="space-y-5">

            {/* ── Upload section ── */}
            <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-800">
                    📷 Cargá una foto o PDF de la factura
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    La IA reconocerá los datos automáticamente (requiere <code className="bg-blue-100 px-1 rounded">ANTHROPIC_KEY</code>)
                  </p>
                </div>
                <label className="cursor-pointer">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                  <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition
                    ${extracting
                      ? 'bg-blue-200 text-blue-500 cursor-wait'
                      : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                    {extracting ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Analizando…
                      </>
                    ) : (
                      <>⬆ Subir archivo</>
                    )}
                  </span>
                </label>
              </div>

              {fileName && !extracting && (
                <p className="text-xs text-blue-700">
                  ✓ <strong>{fileName}</strong>{sugeridos !== null ? ` — ${sugeridos.length} ítem(s) detectado(s)` : ''}
                </p>
              )}

              {extractError && (
                <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">{extractError}</p>
              )}
            </div>

            {/* ── AI suggestions panel ── */}
            {sugeridos && sugeridos.length > 0 && (
              <SuggestionPanel
                sugeridos={sugeridos}
                productos={productos}
                currentItems={items}
                onAgregar={agregarItemDesdeIA}
              />
            )}
            {sugeridos && sugeridos.length === 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                La IA no detectó ítems en el comprobante. Agregá los productos manualmente abajo.
              </p>
            )}

            {/* ── Header fields ── */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Número *</label>
                <input
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  required
                  className="input"
                  placeholder="0001-00001234"
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
                <label className="label">Tipo comprobante</label>
                <select
                  value={tipoComprobante}
                  onChange={(e) => setTipoComprobante(e.target.value)}
                  className="input"
                >
                  <option value="FACTURA">Factura</option>
                  <option value="REMITO">Remito</option>
                  <option value="TICKET">Ticket</option>
                  <option value="NOTA_CREDITO">Nota de crédito</option>
                </select>
              </div>
            </div>

            {/* ── Manual product selector ── */}
            <div>
              <label className="label">Agregar producto manualmente</label>
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

            {/* ── Items table ── */}
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
                        <td className="table-td font-medium">
                          {item.nombre}
                          <span className="ml-1 text-xs text-gray-400">{UNIDADES[item.unidad_medida] ?? item.unidad_medida}</span>
                        </td>
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

            {/* ── Totals ── */}
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
          <button type="submit" form="factura-form" disabled={loading} className="btn-primary">
            {loading ? 'Registrando...' : 'Registrar factura'}
          </button>
        </div>
      </div>
    </div>
  )
}
