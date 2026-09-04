'use client'

import { useRef, useState } from 'react'
import type { Proveedor, Producto } from '@/lib/supabase/types'
import { registrarFacturaCompra } from '@/lib/actions/proveedores'
import { extraerFacturaDesdeArchivo, type ItemExtraido } from '@/lib/actions/extraerFactura'
import { hoy } from '@/lib/fechas'

type Item = {
  producto_id: string   // UUID si existe en DB; '' si es producto nuevo
  nombre: string        // nombre editable (útil para corregir OCR en productos nuevos)
  unidad_medida: string
  cantidad: number
  costo_unitario: number
  subtotal: number
  isNew: boolean        // true = no existe en DB, se creará al registrar la factura
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

function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // sin tildes
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Busca el producto existente que corresponde al renglón leído por la IA.
 *
 * Sólo acepta coincidencias inequívocas: exacta, o una única coincidencia por
 * prefijo. El criterio anterior aceptaba substring en ambas direcciones, así
 * que un renglón "Vidrio" matcheaba "Vidrio float 4mm incoloro" y el ítem se
 * cargaba contra el producto equivocado, cuyo costo y stock los triggers
 * después actualizan. Ante la duda conviene ofrecerlo como producto nuevo y
 * que decida la persona.
 */
function matchProduct(
  nombre: string,
  productos: Pick<Producto, 'id' | 'nombre' | 'unidad_medida' | 'costo_actual'>[],
) {
  const q = normalizar(nombre)
  if (!q) return undefined

  const exacto = productos.find((p) => normalizar(p.nombre) === q)
  if (exacto) return exacto

  const porPrefijo = productos.filter((p) => normalizar(p.nombre).startsWith(q))
  return porPrefijo.length === 1 ? porPrefijo[0] : undefined
}

// ────────────────────────────────────────────────────────────────
// Modal principal
// ────────────────────────────────────────────────────────────────
export default function FacturaCompraModal({ proveedor, productos, onSaved, onClose }: Props) {
  const [items, setItems] = useState<Item[]>([])
  const [iva, setIva] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estado de extracción IA
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [iaResumen, setIaResumen] = useState<{ existentes: number; nuevos: number } | null>(null)

  // Campos de cabecera controlados (la IA los rellena automáticamente)
  const [numero, setNumero] = useState('')
  const [fecha, setFecha] = useState(hoy())
  const [tipoComprobante, setTipoComprobante] = useState('FACTURA')
  const [notas, setNotas] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0)
  const total = subtotal + iva

  // ── Extracción IA + auto-población de ítems ──────────────────────────────
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
    setIaResumen(null)

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

    // Pre-rellenar cabecera con lo que la IA haya podido leer
    if (data.numero) setNumero(data.numero)
    if (data.fecha) setFecha(data.fecha)
    if (data.tipo_comprobante) setTipoComprobante(data.tipo_comprobante)
    if (data.iva != null) setIva(data.iva)
    if (data.notas) setNotas(data.notas)

    // Auto-poblar ítems: detectados → tabla directamente
    autoPopularItems(data.items ?? [])

    setExtracting(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  /**
   * Para cada ítem extraído por la IA:
   *   - Si coincide con un producto existente → lo agrega con su ID
   *   - Si no coincide → lo agrega como producto nuevo (isNew: true)
   * Omite duplicados ya presentes en la tabla.
   */
  function autoPopularItems(sugeridos: ItemExtraido[]) {
    // La deduplicación se calcula DENTRO del updater: leer `items` del closure
    // daba la lista previa al último render, así que subir dos comprobantes
    // seguidos duplicaba renglones.
    setItems((prev) => {
      const nuevos: Item[] = []

      for (const s of sugeridos) {
        const yaEstan = [...prev, ...nuevos]
        const match = matchProduct(s.nombre, productos)

        if (match) {
          if (yaEstan.some((x) => x.producto_id === match.id)) continue
          nuevos.push({
            producto_id: match.id,
            nombre: match.nombre,
            unidad_medida: match.unidad_medida,
            cantidad: s.cantidad,
            costo_unitario: s.costo_unitario,
            subtotal: s.cantidad * s.costo_unitario,
            isNew: false,
          })
        } else {
          const nombre = normalizar(s.nombre)
          if (yaEstan.some((x) => x.isNew && normalizar(x.nombre) === nombre)) continue
          nuevos.push({
            producto_id: '',
            nombre: s.nombre,
            unidad_medida: 'UNIDAD',
            cantidad: s.cantidad,
            costo_unitario: s.costo_unitario,
            subtotal: s.cantidad * s.costo_unitario,
            isNew: true,
          })
        }
      }

      setIaResumen({
        existentes: nuevos.filter((x) => !x.isNew).length,
        nuevos: nuevos.filter((x) => x.isNew).length,
      })

      return nuevos.length > 0 ? [...prev, ...nuevos] : prev
    })
  }

  // ── Gestión manual de ítems ──────────────────────────────────────────────
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
      isNew: false,
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

  function updateItemNombre(idx: number, nombre: string) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, nombre } : item)))
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  // ── Envío ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (items.length === 0) { setError('Agregá al menos un producto.'); return }

    const nuevosSinNombre = items.filter((x) => x.isNew && !x.nombre.trim())
    if (nuevosSinNombre.length > 0) {
      setError('Completá el nombre de los productos nuevos (marcados con 🆕).')
      return
    }

    setLoading(true)
    const itemsPayload = items.map((item) =>
      item.isNew
        ? {
            nombre_nuevo: item.nombre.trim(),
            unidad_medida: item.unidad_medida,
            cantidad: item.cantidad,
            costo_unitario: item.costo_unitario,
            subtotal: item.subtotal,
          }
        : {
            producto_id: item.producto_id,
            cantidad: item.cantidad,
            costo_unitario: item.costo_unitario,
            subtotal: item.subtotal,
          },
    )

    const r = await registrarFacturaCompra({
      proveedor_id: proveedor.id,
      // Vacío ⇒ la base asigna el siguiente número correlativo.
      numero,
      fecha,
      tipo_comprobante: tipoComprobante,
      subtotal,
      iva,
      total,
      notas,
      items: itemsPayload,
    })
    setLoading(false)
    if (!r.ok) { setError(r.error); return }
    onSaved()
  }

  const newCount = items.filter((x) => x.isNew).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">

        {/* Encabezado */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Nueva factura de compra</h2>
          <p className="text-sm text-gray-500 mt-1">Proveedor: <strong>{proveedor.razon_social}</strong></p>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          <form id="factura-form" onSubmit={handleSubmit} className="space-y-5">

            {/* ── Zona de carga ── */}
            <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-800">
                    📷 Cargá una foto o PDF de la factura
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    La IA detecta los ítems y los agrega automáticamente a la tabla
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

              {/* Resumen IA */}
              {iaResumen && !extracting && fileName && (
                <div className="text-xs text-blue-800 bg-blue-100 rounded-lg px-3 py-2 space-y-0.5">
                  <p>✓ <strong>{fileName}</strong></p>
                  {iaResumen.existentes === 0 && iaResumen.nuevos === 0 ? (
                    <p className="text-amber-700">La IA no detectó ítems nuevos (puede que ya estén todos agregados).</p>
                  ) : (
                    <p>
                      {iaResumen.existentes > 0 && <span>{iaResumen.existentes} ítem{iaResumen.existentes > 1 ? 's' : ''} ya existente{iaResumen.existentes > 1 ? 's' : ''} en stock · </span>}
                      {iaResumen.nuevos > 0 && <span className="text-blue-700 font-semibold">{iaResumen.nuevos} producto{iaResumen.nuevos > 1 ? 's' : ''} nuevo{iaResumen.nuevos > 1 ? 's' : ''} (se crearán automáticamente)</span>}
                    </p>
                  )}
                </div>
              )}

              {extractError && (
                <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">{extractError}</p>
              )}
            </div>

            {/* ── Campos de cabecera ── */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Número * <span className="font-normal text-gray-400">(el del proveedor)</span></label>
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

            {/* ── Selector manual de producto ── */}
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

            {/* ── Tabla de ítems ── */}
            {items.length > 0 && (
              <>
                {newCount > 0 && (
                  <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    🆕 Los ítems marcados con el badge azul <strong>no existen</strong> en la base de datos. Se crearán automáticamente como productos nuevos al registrar la factura. Podés editar el nombre si el OCR lo leyó mal.
                  </p>
                )}
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
                        <tr key={idx} className={item.isNew ? 'bg-blue-50/40' : ''}>
                          <td className="table-td font-medium">
                            {item.isNew ? (
                              <div className="flex items-center gap-1.5">
                                <span className="shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700">🆕 Nuevo</span>
                                <input
                                  type="text"
                                  value={item.nombre}
                                  onChange={(e) => updateItemNombre(idx, e.target.value)}
                                  className="input text-sm font-medium min-w-0 flex-1"
                                  placeholder="Nombre del producto"
                                />
                              </div>
                            ) : (
                              <>
                                {item.nombre}
                                <span className="ml-1 text-xs text-gray-400">{UNIDADES[item.unidad_medida] ?? item.unidad_medida}</span>
                              </>
                            )}
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
              </>
            )}

            {/* ── Totales ── */}
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

        {/* Pie */}
        <div className="border-t border-gray-100 p-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" form="factura-form" disabled={loading} className="btn-primary">
            {loading
              ? 'Registrando…'
              : newCount > 0
                ? `Registrar factura (crear ${newCount} producto${newCount > 1 ? 's' : ''})`
                : 'Registrar factura'}
          </button>
        </div>
      </div>
    </div>
  )
}
