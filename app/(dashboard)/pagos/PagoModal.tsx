'use client'

import { useState, useEffect } from 'react'
import type { Cliente, Proveedor, FacturaVenta, FacturaCompra } from '@/lib/supabase/types'
import { registrarPago } from '@/lib/actions/pagos'

type Tipo = 'COBRO_CLIENTE' | 'PAGO_PROVEEDOR'

type ClienteSlim   = Pick<Cliente,   'id' | 'nombre' | 'apellido' | 'razon_social'>
type ProveedorSlim = Pick<Proveedor, 'id' | 'razon_social'>
type FacturaVentaSlim  = Pick<FacturaVenta,  'id' | 'numero' | 'fecha' | 'total' | 'saldo_pendiente' | 'cliente_id'>
type FacturaCompraSlim = Pick<FacturaCompra, 'id' | 'numero' | 'fecha' | 'total' | 'saldo_pendiente' | 'proveedor_id'>

type Imputacion = {
  factura_venta_id?:  string
  factura_compra_id?: string
  numero:       string
  saldo:        number
  monto_imputado: number
  checked:      boolean
}

type Props = {
  tipo:       Tipo
  clientes:   ClienteSlim[]
  proveedores: ProveedorSlim[]
  facturasVenta:  FacturaVentaSlim[]
  facturasCompra: FacturaCompraSlim[]
  onSaved: () => void
  onClose: () => void
}

const MEDIOS_PAGO = ['Efectivo', 'Transferencia', 'Cheque', 'Tarjeta débito', 'Tarjeta crédito', 'Otro']

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

function clienteLabel(c: ClienteSlim) {
  if (c.razon_social) return c.razon_social
  return [c.nombre, c.apellido].filter(Boolean).join(' ')
}

export default function PagoModal({ tipo, clientes, proveedores, facturasVenta, facturasCompra, onSaved, onClose }: Props) {
  const [entidadId, setEntidadId]     = useState('')
  const [monto, setMonto]             = useState<number | ''>('')
  const [medioPago, setMedioPago]     = useState('Efectivo')
  const [fecha, setFecha]             = useState(new Date().toISOString().slice(0, 10))
  const [notas, setNotas]             = useState('')
  const [imputaciones, setImputaciones] = useState<Imputacion[]>([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const esCobro = tipo === 'COBRO_CLIENTE'
  const titulo  = esCobro ? 'Nuevo cobro a cliente' : 'Nuevo pago a proveedor'

  // Cuando cambia la entidad, cargar sus facturas pendientes
  useEffect(() => {
    if (!entidadId) { setImputaciones([]); return }
    if (esCobro) {
      const facturas = facturasVenta.filter((f) => f.cliente_id === entidadId && f.saldo_pendiente > 0)
      setImputaciones(facturas.map((f) => ({
        factura_venta_id: f.id,
        numero:           f.numero,
        saldo:            f.saldo_pendiente,
        monto_imputado:   f.saldo_pendiente,
        checked:          true,
      })))
    } else {
      const facturas = facturasCompra.filter((f) => f.proveedor_id === entidadId && f.saldo_pendiente > 0)
      setImputaciones(facturas.map((f) => ({
        factura_compra_id: f.id,
        numero:            f.numero,
        saldo:             f.saldo_pendiente,
        monto_imputado:    f.saldo_pendiente,
        checked:           true,
      })))
    }
  }, [entidadId, esCobro, facturasVenta, facturasCompra])

  // Al cambiar monto, recalcular distribución proporcional
  useEffect(() => {
    const montoNum = typeof monto === 'number' ? monto : 0
    if (montoNum <= 0) return
    let restante = montoNum
    setImputaciones((prev) => prev.map((imp) => {
      if (!imp.checked) return { ...imp, monto_imputado: 0 }
      const asignado = Math.min(imp.saldo, restante)
      restante = Math.max(0, restante - asignado)
      return { ...imp, monto_imputado: asignado }
    }))
  }, [monto])

  const totalImputado = imputaciones.filter((i) => i.checked).reduce((s, i) => s + i.monto_imputado, 0)
  const montoNum = typeof monto === 'number' ? monto : 0
  const excede   = totalImputado > montoNum + 0.01

  function toggleImputacion(idx: number) {
    setImputaciones((prev) =>
      prev.map((imp, i) => i !== idx ? imp : { ...imp, checked: !imp.checked, monto_imputado: !imp.checked ? imp.saldo : 0 })
    )
  }

  function updateMontoImputado(idx: number, val: number) {
    setImputaciones((prev) =>
      prev.map((imp, i) => i !== idx ? imp : { ...imp, monto_imputado: Math.min(val, imp.saldo) })
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!entidadId) { setError(esCobro ? 'Seleccioná un cliente.' : 'Seleccioná un proveedor.'); return }
    if (!montoNum || montoNum <= 0) { setError('Ingresá el monto.'); return }
    if (excede) { setError('El total imputado supera el monto del pago.'); return }

    setLoading(true)
    try {
      await registrarPago({
        tipo,
        ...(esCobro ? { cliente_id: entidadId } : { proveedor_id: entidadId }),
        monto:       montoNum,
        medio_pago:  medioPago,
        fecha,
        notas:       notas || null,
        imputaciones: imputaciones
          .filter((i) => i.checked && i.monto_imputado > 0)
          .map(({ factura_venta_id, factura_compra_id, monto_imputado }) =>
            ({ factura_venta_id, factura_compra_id, monto_imputado })
          ),
      })
      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar pago')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{titulo}</h2>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          <form id="pago-form" onSubmit={handleSubmit} className="space-y-5">

            {/* Entidad */}
            <div>
              <label className="label">{esCobro ? 'Cliente *' : 'Proveedor *'}</label>
              <select
                value={entidadId}
                onChange={(e) => setEntidadId(e.target.value)}
                required
                className="input"
              >
                <option value="">— Seleccionar —</option>
                {esCobro
                  ? clientes.map((c)   => <option key={c.id} value={c.id}>{clienteLabel(c)}</option>)
                  : proveedores.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)
                }
              </select>
            </div>

            {/* Monto + Medio + Fecha */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Monto *</label>
                <input
                  type="number" step="0.01" min="0.01"
                  value={monto}
                  onChange={(e) => setMonto(parseFloat(e.target.value) || '')}
                  required
                  className="input"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="label">Medio de pago *</label>
                <select value={medioPago} onChange={(e) => setMedioPago(e.target.value)} className="input">
                  {MEDIOS_PAGO.map((m) => <option key={m} value={m}>{m}</option>)}
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
            </div>

            {/* Imputación a facturas */}
            {entidadId && imputaciones.length > 0 && (
              <div>
                <label className="label">Imputar a facturas pendientes</label>
                <div className="rounded-lg border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="table-th w-8"></th>
                        <th className="table-th">Factura</th>
                        <th className="table-th text-right">Saldo</th>
                        <th className="table-th text-right">Imputar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {imputaciones.map((imp, idx) => (
                        <tr key={imp.factura_venta_id ?? imp.factura_compra_id} className={imp.checked ? '' : 'opacity-50'}>
                          <td className="table-td text-center">
                            <input
                              type="checkbox"
                              checked={imp.checked}
                              onChange={() => toggleImputacion(idx)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                          </td>
                          <td className="table-td font-mono text-xs">{imp.numero}</td>
                          <td className="table-td text-right text-gray-500">{formatCurrency(imp.saldo)}</td>
                          <td className="table-td text-right">
                            <input
                              type="number" step="0.01" min="0"
                              value={imp.monto_imputado}
                              onChange={(e) => updateMontoImputado(idx, parseFloat(e.target.value) || 0)}
                              disabled={!imp.checked}
                              className="input w-28 text-right text-sm disabled:opacity-40"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Resumen imputación */}
                <div className="mt-2 flex justify-end gap-4 text-sm">
                  <span className="text-gray-500">
                    Total imputado: <strong className={excede ? 'text-red-600' : 'text-gray-800'}>{formatCurrency(totalImputado)}</strong>
                  </span>
                  {montoNum > 0 && (
                    <span className="text-gray-500">
                      Restante sin imputar: <strong className={montoNum - totalImputado < -0.01 ? 'text-red-600' : 'text-green-700'}>
                        {formatCurrency(montoNum - totalImputado)}
                      </strong>
                    </span>
                  )}
                </div>
                {excede && (
                  <p className="mt-1 text-xs text-red-600">El total imputado supera el monto del pago.</p>
                )}
              </div>
            )}
            {entidadId && imputaciones.length === 0 && (
              <p className="text-sm text-gray-400 italic">
                {esCobro ? 'Este cliente no tiene facturas pendientes.' : 'Este proveedor no tiene facturas pendientes.'}
              </p>
            )}

            {/* Notas */}
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
          <button
            type="submit"
            form="pago-form"
            disabled={loading}
            className={`btn-primary ${esCobro ? '' : 'bg-orange-600 hover:bg-orange-700'}`}
          >
            {loading ? 'Registrando...' : esCobro ? 'Registrar cobro' : 'Registrar pago'}
          </button>
        </div>
      </div>
    </div>
  )
}
