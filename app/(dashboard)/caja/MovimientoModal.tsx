'use client'

import { useState } from 'react'
import { registrarVenta, registrarIngreso, registrarEgreso } from '@/lib/actions/caja'
import { CATEGORIAS_EGRESO, MEDIOS_PAGO, type CategoriaEgreso } from '@/lib/caja'
import { hoy } from '@/lib/fechas'

type ProductoSlim = { id: string; nombre: string; unidad_medida: string; precio_venta: number; stock_actual: number }
type ClienteSlim  = { id: string; nombre: string; apellido: string | null; razon_social: string | null }
type ProveedorSlim = { id: string; razon_social: string }
type FacturaCompraSlim = { id: string; numero: string; fecha: string; total: number; saldo_pendiente: number; proveedor_id: string }

type Props = {
  productos:      ProductoSlim[]
  clientes:       ClienteSlim[]
  proveedores:    ProveedorSlim[]
  facturasCompra: FacturaCompraSlim[]
  onSaved: () => void
  onClose: () => void
}

type Tipo = 'INGRESO' | 'EGRESO'
type MotivoIngreso = 'VENTA' | 'OTRO'

type ItemVenta = {
  producto_id:     string
  nombre:          string
  unidad_medida:   string
  stock_actual:    number
  cantidad:        number
  precio_unitario: number
  subtotal:        number
}

const UNIDADES: Record<string, string> = { UNIDAD: 'und.', M2: 'm²', ML: 'ml' }

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

function redondear(n: number) {
  return Math.round(n * 100) / 100
}

function clienteLabel(c: ClienteSlim) {
  if (c.razon_social) return c.razon_social
  return [c.nombre, c.apellido].filter(Boolean).join(' ')
}

export default function MovimientoModal({
  productos, clientes, proveedores, facturasCompra, onSaved, onClose,
}: Props) {
  const [tipo, setTipo]       = useState<Tipo>('INGRESO')
  const [motivo, setMotivo]   = useState<MotivoIngreso>('VENTA')
  const [fecha, setFecha]     = useState(hoy())
  const [medioPago, setMedio] = useState<string>('Efectivo')
  const [notas, setNotas]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  // Ingreso por venta
  const [items, setItems]         = useState<ItemVenta[]>([])
  const [clienteId, setClienteId] = useState('')
  const [iva, setIva]             = useState(0)

  // Ingreso por otro motivo / egreso que no es a proveedor
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto]       = useState<number | ''>('')

  // Egreso
  const [categoria, setCategoria]     = useState<CategoriaEgreso>('PROVEEDOR')
  const [proveedorId, setProveedorId] = useState('')
  const [imputado, setImputado]       = useState<Record<string, number>>({})

  const esVenta     = tipo === 'INGRESO' && motivo === 'VENTA'
  const esProveedor = tipo === 'EGRESO' && categoria === 'PROVEEDOR'

  const totalVenta = redondear(items.reduce((s, i) => s + i.subtotal, 0))
  const montoFinal = esVenta ? totalVenta : (typeof monto === 'number' ? monto : 0)

  const facturasDelProveedor = facturasCompra.filter(
    (f) => f.proveedor_id === proveedorId && f.saldo_pendiente > 0,
  )
  const totalImputado = redondear(
    Object.values(imputado).reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0),
  )
  const sinImputar = redondear(montoFinal - totalImputado)

  // ── Ítems de la venta ──────────────────────────────────────────────────────
  function agregarProducto(id: string) {
    const p = productos.find((x) => x.id === id)
    if (!p || items.some((i) => i.producto_id === id)) return
    setItems((prev) => [...prev, {
      producto_id:     p.id,
      nombre:          p.nombre,
      unidad_medida:   p.unidad_medida,
      stock_actual:    p.stock_actual,
      cantidad:        1,
      precio_unitario: p.precio_venta,
      subtotal:        p.precio_venta,
    }])
  }

  function updateItem(idx: number, campo: 'cantidad' | 'precio_unitario', valor: number) {
    setItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item
      const act = { ...item, [campo]: valor }
      act.subtotal = redondear(act.cantidad * act.precio_unitario)
      return act
    }))
  }

  // ── Envío ──────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (esVenta) {
      if (items.length === 0) { setError('Elegí qué se vendió.'); return }
      const sinStock = items.find((i) => i.cantidad > i.stock_actual)
      if (sinStock) {
        setError(`No hay stock suficiente de ${sinStock.nombre}: hay ${sinStock.stock_actual}.`)
        return
      }
    } else if (montoFinal <= 0) {
      setError('Ingresá el monto.')
      return
    }

    if (esProveedor) {
      if (!proveedorId) { setError('Elegí el proveedor al que se le pagó.'); return }
      if (totalImputado > montoFinal + 0.001) {
        setError('Lo cargado a las facturas supera el monto del egreso.')
        return
      }
    } else if (!esVenta && !concepto.trim()) {
      setError('Detallá de qué es el movimiento.')
      return
    }

    setLoading(true)
    const r = esVenta
      ? await registrarVenta({
          total:      totalVenta,
          iva,
          medio_pago: medioPago,
          fecha,
          cliente_id: clienteId || null,
          notas:      notas.trim(),
          items: items.map(({ producto_id, cantidad, precio_unitario, subtotal }) => ({
            producto_id, cantidad, precio_unitario, subtotal,
          })),
        })
      : tipo === 'INGRESO'
        ? await registrarIngreso({
            concepto: concepto.trim(), monto: montoFinal,
            medio_pago: medioPago, fecha, notas: notas.trim(),
          })
        : await registrarEgreso({
            categoria,
            concepto:     concepto.trim(),
            monto:        montoFinal,
            medio_pago:   medioPago,
            fecha,
            proveedor_id: esProveedor ? proveedorId : null,
            imputaciones: esProveedor
              ? Object.entries(imputado)
                  .filter(([, v]) => v > 0)
                  .map(([factura_compra_id, monto_imputado]) => ({ factura_compra_id, monto_imputado }))
              : [],
            notas: notas.trim(),
          })

    setLoading(false)
    if (!r.ok) { setError(r.error); return }
    onSaved()
  }

  const disponibles = productos.filter((p) => !items.some((i) => i.producto_id === p.id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">Nuevo movimiento de caja</h2>
          <button onClick={onClose} className="text-xl leading-none text-gray-400 hover:text-gray-600">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form id="mov-form" onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
            )}

            {/* ── Ingreso o egreso ── */}
            <div className="flex overflow-hidden rounded-lg border border-gray-200 text-sm">
              {(['INGRESO', 'EGRESO'] as Tipo[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTipo(t); setError(null) }}
                  className={`flex-1 py-2.5 font-medium transition-colors ${
                    tipo === t
                      ? t === 'INGRESO' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {t === 'INGRESO' ? '↑ Entra plata' : '↓ Sale plata'}
                </button>
              ))}
            </div>

            {/* ── INGRESO: venta u otro motivo ── */}
            {tipo === 'INGRESO' && (
              <div>
                <label className="label">¿De qué es el ingreso? *</label>
                <div className="flex overflow-hidden rounded-lg border border-gray-200 text-sm">
                  {([['VENTA', 'Venta de productos'], ['OTRO', 'Otro motivo']] as const).map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => { setMotivo(v); setError(null) }}
                      className={`flex-1 py-2 font-medium transition-colors ${
                        motivo === v ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── EGRESO: categoría ── */}
            {tipo === 'EGRESO' && (
              <div>
                <label className="label">Categoría del egreso *</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIAS_EGRESO.map((c) => (
                    <button
                      key={c.valor}
                      type="button"
                      onClick={() => { setCategoria(c.valor); setError(null) }}
                      className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                        categoria === c.valor
                          ? 'border-red-600 bg-red-600 text-white'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Venta: productos del stock ── */}
            {esVenta && <VentaFields
              productos={disponibles} items={items} setItems={setItems}
              agregarProducto={agregarProducto} updateItem={updateItem}
              clientes={clientes} clienteId={clienteId} setClienteId={setClienteId}
              total={totalVenta} iva={iva} setIva={setIva}
            />}

            {/* ── Otro ingreso, o egreso que no es a proveedor: concepto + monto ── */}
            {!esVenta && !esProveedor && (
              <>
                <div>
                  <label className="label">
                    {tipo === 'INGRESO' ? '¿De qué es? *' : 'Detalle del egreso *'}
                  </label>
                  <input
                    value={concepto}
                    onChange={(e) => setConcepto(e.target.value)}
                    className="input"
                    placeholder={tipo === 'INGRESO'
                      ? 'Aporte de socio, reintegro, alquiler cobrado…'
                      : 'Factura de luz, nafta de la camioneta, retiro…'}
                  />
                </div>
                <div>
                  <label className="label">Monto *</label>
                  <input
                    type="number" step="0.01" min="0.01"
                    value={monto}
                    onChange={(e) => setMonto(parseFloat(e.target.value) || '')}
                    className="input"
                    placeholder="0"
                  />
                </div>
              </>
            )}

            {/* ── Egreso a proveedor: elegir facturas e imputar ── */}
            {esProveedor && <ProveedorFields
              proveedores={proveedores} proveedorId={proveedorId}
              setProveedorId={(id) => { setProveedorId(id); setImputado({}) }}
              facturas={facturasDelProveedor}
              monto={monto} setMonto={setMonto}
              imputado={imputado} setImputado={setImputado}
              totalImputado={totalImputado} sinImputar={sinImputar}
            />}

            {/* ── Medio de pago y fecha: siempre ── */}
            <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
              <div>
                <label className="label">Medio de pago *</label>
                <select value={medioPago} onChange={(e) => setMedio(e.target.value)} className="input" required>
                  {MEDIOS_PAGO.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Fecha *</label>
                <input
                  type="date" value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="input" required
                />
              </div>
            </div>

            <div>
              <label className="label">Notas <span className="font-normal text-gray-400">(opcional)</span></label>
              <input value={notas} onChange={(e) => setNotas(e.target.value)} className="input" />
            </div>
          </form>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
          <span className="text-sm text-gray-500">
            {montoFinal > 0 && (
              <>
                {tipo === 'INGRESO' ? 'Entra ' : 'Sale '}
                <strong className={tipo === 'INGRESO' ? 'text-green-700' : 'text-red-700'}>
                  {formatCurrency(montoFinal)}
                </strong>
              </>
            )}
          </span>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" form="mov-form" disabled={loading} className="btn-primary">
              {loading ? 'Guardando…' : 'Registrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Venta ────────────────────────────────────────────────────────────────────

function VentaFields({
  productos, items, setItems, agregarProducto, updateItem,
  clientes, clienteId, setClienteId, total, iva, setIva,
}: {
  productos: ProductoSlim[]
  items: ItemVenta[]
  setItems: React.Dispatch<React.SetStateAction<ItemVenta[]>>
  agregarProducto: (id: string) => void
  updateItem: (idx: number, campo: 'cantidad' | 'precio_unitario', valor: number) => void
  clientes: ClienteSlim[]
  clienteId: string
  setClienteId: (id: string) => void
  total: number
  iva: number
  setIva: (n: number) => void
}) {
  return (
    <>
      <div>
        <label className="label">¿Qué se vendió? *</label>
        <select
          value=""
          onChange={(e) => { if (e.target.value) agregarProducto(e.target.value) }}
          className="input"
        >
          <option value="">Elegí un producto del stock…</option>
          {productos.map((p) => (
            <option key={p.id} value={p.id} disabled={p.stock_actual <= 0}>
              {p.nombre} — {formatCurrency(p.precio_venta)}
              {p.stock_actual <= 0 ? ' (sin stock)' : ` · hay ${p.stock_actual} ${UNIDADES[p.unidad_medida] ?? ''}`}
            </option>
          ))}
        </select>

        {items.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">
            Todavía no agregaste nada. El stock se descuenta solo al registrar.
          </p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-th">Producto</th>
                  <th className="table-th w-24 text-right">Cant.</th>
                  <th className="table-th w-28 text-right">Precio</th>
                  <th className="table-th w-28 text-right">Subtotal</th>
                  <th className="table-th w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item, idx) => (
                  <tr key={item.producto_id}>
                    <td className="table-td">
                      <span className="font-medium text-gray-900">{item.nombre}</span>
                      <span className={`block text-xs ${item.cantidad > item.stock_actual ? 'text-red-600' : 'text-gray-400'}`}>
                        hay {item.stock_actual} {UNIDADES[item.unidad_medida] ?? ''}
                      </span>
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
                        className="input w-24 text-right text-sm"
                      />
                    </td>
                    <td className="table-td text-right font-medium">{formatCurrency(item.subtotal)}</td>
                    <td className="table-td text-center">
                      <button
                        type="button"
                        onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-gray-300 hover:text-red-600"
                        aria-label="Quitar"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-end gap-6 border-t border-gray-100 bg-gray-50 px-4 py-2">
              <span className="text-sm text-gray-500">Total de la venta</span>
              <strong className="text-gray-900">{formatCurrency(total)}</strong>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Cliente <span className="font-normal text-gray-400">(opcional)</span></label>
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="input">
            <option value="">Consumidor final (mostrador)</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{clienteLabel(c)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">
            IVA <span className="font-normal text-gray-400">(contenido en el total)</span>
          </label>
          <input
            type="number" step="0.01" min="0"
            value={iva}
            onChange={(e) => setIva(parseFloat(e.target.value) || 0)}
            className="input"
          />
          <div className="mt-1 flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => setIva(redondear(total - total / 1.21))}
              className="rounded border border-gray-200 px-2 py-0.5 text-gray-600 hover:bg-gray-50"
            >
              21%
            </button>
            <button
              type="button"
              onClick={() => setIva(0)}
              className="rounded border border-gray-200 px-2 py-0.5 text-gray-600 hover:bg-gray-50"
            >
              Sin IVA
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Egreso a proveedor ───────────────────────────────────────────────────────

function ProveedorFields({
  proveedores, proveedorId, setProveedorId, facturas,
  monto, setMonto, imputado, setImputado, totalImputado, sinImputar,
}: {
  proveedores: ProveedorSlim[]
  proveedorId: string
  setProveedorId: (id: string) => void
  facturas: FacturaCompraSlim[]
  monto: number | ''
  setMonto: (n: number | '') => void
  imputado: Record<string, number>
  setImputado: React.Dispatch<React.SetStateAction<Record<string, number>>>
  totalImputado: number
  sinImputar: number
}) {
  const deudaTotal = facturas.reduce((s, f) => s + f.saldo_pendiente, 0)

  return (
    <>
      <div>
        <label className="label">Proveedor *</label>
        <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} className="input" required>
          <option value="">Elegí el proveedor…</option>
          {proveedores.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
        </select>
      </div>

      <div>
        <label className="label">Monto pagado *</label>
        <input
          type="number" step="0.01" min="0.01"
          value={monto}
          onChange={(e) => setMonto(parseFloat(e.target.value) || '')}
          className="input"
          placeholder="0"
        />
      </div>

      {proveedorId && (
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <label className="label mb-0">¿A qué facturas se le imputa?</label>
            <span className="text-xs text-gray-500">Debe {formatCurrency(deudaTotal)}</span>
          </div>

          {facturas.length === 0 ? (
            <p className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500">
              Este proveedor no tiene facturas con saldo pendiente. El pago queda registrado
              a cuenta.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-th">Factura</th>
                    <th className="table-th text-right">Saldo</th>
                    <th className="table-th w-36 text-right">Se le imputa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {facturas.map((f) => {
                    const valor = imputado[f.id] ?? 0
                    const excede = valor > f.saldo_pendiente + 0.01
                    return (
                      <tr key={f.id}>
                        <td className="table-td">
                          <span className="font-mono text-xs font-medium text-gray-900">{f.numero}</span>
                          <span className="block text-xs text-gray-400">{f.fecha}</span>
                        </td>
                        <td className="table-td text-right font-medium text-red-600">
                          {formatCurrency(f.saldo_pendiente)}
                        </td>
                        <td className="table-td text-right">
                          <input
                            type="number" step="0.01" min="0" max={f.saldo_pendiente}
                            value={imputado[f.id] ?? ''}
                            onChange={(e) => setImputado((prev) => ({
                              ...prev, [f.id]: parseFloat(e.target.value) || 0,
                            }))}
                            className={`input w-32 text-right text-sm ${excede ? 'border-red-400' : ''}`}
                            placeholder="0"
                          />
                          {valor > 0 && !excede && (
                            <span className="mt-0.5 block text-xs text-gray-400">
                              quedan {formatCurrency(f.saldo_pendiente - valor)}
                            </span>
                          )}
                          {excede && (
                            <span className="mt-0.5 block text-xs text-red-600">
                              supera el saldo
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-2 text-xs">
                <span className="text-gray-500">Imputado {formatCurrency(totalImputado)}</span>
                <span className={sinImputar < 0 ? 'font-medium text-red-600' : 'text-gray-500'}>
                  {sinImputar < 0
                    ? `Te pasaste por ${formatCurrency(Math.abs(sinImputar))}`
                    : sinImputar > 0
                      ? `Quedan ${formatCurrency(sinImputar)} a cuenta`
                      : 'Todo imputado'}
                </span>
              </div>
            </div>
          )}
          <p className="mt-2 text-xs text-gray-400">
            Podés pagar una parte: si una factura debe $200.000 y le cargás $100.000,
            quedan $100.000 pendientes en ella.
          </p>
        </div>
      )}
    </>
  )
}
