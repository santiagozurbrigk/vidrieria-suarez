'use client'

import { useState } from 'react'
import { editarEgreso } from '@/lib/actions/gastos'
import { CATEGORIAS_EGRESO, MEDIOS_PAGO, type CategoriaEgreso } from '@/lib/caja'
import { fechaParaInput } from '@/lib/fechas'

/**
 * Edición de un egreso ya cargado. No crea: los egresos nuevos entran por Caja.
 *
 * Ramifica según de dónde venga el egreso:
 *   - gasto propio   → categoría, detalle y monto
 *   - pago a proveedor → proveedor y reparto del monto entre sus facturas
 */
type EgresoEditable = {
  movimiento_id:    string
  concepto:         string
  monto:            number
  fecha:            string
  medio_pago:       string | null
  categoria_egreso: string | null
  proveedor_id:     string | null
  notas:            string | null
  /** true cuando el egreso es un pago a proveedor (arrastra imputaciones). */
  es_pago:          boolean
}

type ProveedorSlim = { id: string; razon_social: string }
type FacturaSlim = {
  id: string
  numero: string
  fecha: string
  total: number
  saldo_pendiente: number
  proveedor_id: string
  /** Cuánto de esta factura paga ESTE egreso hoy. */
  imputado_aqui: number
}

type Props = {
  egreso:         EgresoEditable
  proveedores:    ProveedorSlim[]
  facturasCompra: FacturaSlim[]
  onSaved: () => void
  onClose: () => void
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

function redondear(n: number) {
  return Math.round(n * 100) / 100
}

export default function GastoModal({
  egreso, proveedores, facturasCompra, onSaved, onClose,
}: Props) {
  const esPago = egreso.es_pago

  const [categoria, setCategoria] = useState<CategoriaEgreso>(
    (egreso.categoria_egreso as CategoriaEgreso | null) ?? 'VARIOS',
  )
  const [concepto, setConcepto]   = useState(egreso.concepto)
  const [monto, setMonto]         = useState<number | ''>(egreso.monto)
  // `fecha` llega como timestamptz de la vista; el input necesita YYYY-MM-DD en
  // la zona del negocio, no en UTC.
  const [fecha, setFecha]         = useState(fechaParaInput(egreso.fecha))
  const [medioPago, setMedioPago] = useState(egreso.medio_pago ?? 'Efectivo')
  const [notas, setNotas]         = useState(egreso.notas ?? '')
  const [proveedorId, setProveedorId] = useState(egreso.proveedor_id ?? '')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  // Arranca con lo que este pago ya tiene imputado, para que editar el monto no
  // obligue a volver a repartir todo desde cero.
  const [imputado, setImputado] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      facturasCompra.filter((f) => f.imputado_aqui > 0).map((f) => [f.id, f.imputado_aqui]),
    ),
  )

  const montoFinal = typeof monto === 'number' ? monto : 0

  // El saldo disponible de cada factura tiene que sumar lo que este pago le
  // imputa hoy: si no, editarlo parecería no tener lugar en su propia factura.
  const facturasDelProveedor = facturasCompra
    .filter((f) => f.proveedor_id === proveedorId)
    .map((f) => ({ ...f, disponible: redondear(f.saldo_pendiente + f.imputado_aqui) }))
    .filter((f) => f.disponible > 0)

  const totalImputado = redondear(
    Object.values(imputado).reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0),
  )
  const sinImputar = redondear(montoFinal - totalImputado)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (montoFinal <= 0) { setError('Ingresá el monto.'); return }
    if (esPago) {
      if (!proveedorId) { setError('Elegí el proveedor al que se le pagó.'); return }
      if (totalImputado > montoFinal + 0.001) {
        setError('Lo cargado a las facturas supera el monto del egreso.')
        return
      }
    } else if (!concepto.trim()) {
      setError('Detallá de qué es el egreso.')
      return
    }

    setLoading(true)
    const r = await editarEgreso({
      movimiento_id: egreso.movimiento_id,
      es_pago:       esPago,
      categoria:     esPago ? null : categoria,
      concepto:      esPago ? '' : concepto.trim(),
      monto:         montoFinal,
      medio_pago:    medioPago,
      fecha,
      proveedor_id:  esPago ? proveedorId : null,
      imputaciones:  esPago
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            {esPago ? 'Editar pago a proveedor' : 'Editar egreso'}
          </h2>
          {esPago && (
            <p className="mt-1 text-sm text-gray-500">
              Si cambiás el monto, repartilo de nuevo entre las facturas.
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form id="egreso-form" onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            {/* ── Gasto propio ── */}
            {!esPago && (
              <>
                <div>
                  <label className="label">Categoría *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIAS_EGRESO.filter((c) => c.valor !== 'PROVEEDOR').map((c) => (
                      <button
                        key={c.valor}
                        type="button"
                        onClick={() => setCategoria(c.valor)}
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
                  <p className="mt-1 text-xs text-gray-400">
                    Para convertirlo en un pago a proveedor, eliminá este egreso y cargalo
                    desde Caja, así se imputa a sus facturas.
                  </p>
                </div>

                <div>
                  <label className="label">Detalle *</label>
                  <input
                    value={concepto}
                    onChange={(e) => setConcepto(e.target.value)}
                    className="input"
                    placeholder="Descripción del egreso"
                  />
                </div>
              </>
            )}

            {/* ── Pago a proveedor ── */}
            {esPago && (
              <div>
                <label className="label">Proveedor *</label>
                <select
                  value={proveedorId}
                  onChange={(e) => { setProveedorId(e.target.value); setImputado({}) }}
                  className="input"
                  required
                >
                  <option value="">Elegí el proveedor…</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>{p.razon_social}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Monto *</label>
                <input
                  type="number" step="0.01" min="0.01"
                  value={monto}
                  onChange={(e) => setMonto(parseFloat(e.target.value) || '')}
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

            {/* ── Reparto entre facturas ── */}
            {esPago && proveedorId && (
              <div>
                <label className="label">¿A qué facturas se le imputa?</label>

                {facturasDelProveedor.length === 0 ? (
                  <p className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                    Este proveedor no tiene facturas con saldo pendiente. El pago queda
                    registrado a cuenta.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-gray-100">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="table-th">Factura</th>
                          <th className="table-th text-right">Saldo</th>
                          <th className="table-th w-32 text-right">Se le imputa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {facturasDelProveedor.map((f) => {
                          const valor = imputado[f.id] ?? 0
                          const excede = valor > f.disponible + 0.01
                          return (
                            <tr key={f.id}>
                              <td className="table-td">
                                <span className="font-mono text-xs font-medium text-gray-900">
                                  {f.numero}
                                </span>
                                <span className="block text-xs text-gray-400">{f.fecha}</span>
                              </td>
                              <td className="table-td text-right font-medium text-red-600">
                                {formatCurrency(f.disponible)}
                                {f.imputado_aqui > 0 && (
                                  <span className="block text-xs font-normal text-gray-400">
                                    incluye {formatCurrency(f.imputado_aqui)} de este pago
                                  </span>
                                )}
                              </td>
                              <td className="table-td text-right">
                                <input
                                  type="number" step="0.01" min="0" max={f.disponible}
                                  value={imputado[f.id] ?? ''}
                                  onChange={(e) => setImputado((prev) => ({
                                    ...prev, [f.id]: parseFloat(e.target.value) || 0,
                                  }))}
                                  className={`input w-28 text-right text-sm ${excede ? 'border-red-400' : ''}`}
                                  placeholder="0"
                                />
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
              </div>
            )}

            <div>
              <label className="label">Medio de pago</label>
              <select value={medioPago} onChange={(e) => setMedioPago(e.target.value)} className="input">
                {MEDIOS_PAGO.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Notas</label>
              <input value={notas} onChange={(e) => setNotas(e.target.value)} className="input" />
            </div>
          </form>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" form="egreso-form" disabled={loading} className="btn-primary">
            {loading ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
