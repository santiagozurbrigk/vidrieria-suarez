'use client'

import { useMemo, useState } from 'react'
import type { Cliente, Proveedor, FacturaVenta, FacturaCompra } from '@/lib/supabase/types'
import { registrarPago } from '@/lib/actions/pagos'
import { hoy } from '@/lib/fechas'

type Tipo = 'COBRO_CLIENTE' | 'PAGO_PROVEEDOR'

type ClienteSlim   = Pick<Cliente,   'id' | 'nombre' | 'apellido' | 'razon_social'>
type ProveedorSlim = Pick<Proveedor, 'id' | 'razon_social'>
type FacturaVentaSlim  = Pick<FacturaVenta,  'id' | 'numero' | 'fecha' | 'total' | 'saldo_pendiente' | 'cliente_id'>
type FacturaCompraSlim = Pick<FacturaCompra, 'id' | 'numero' | 'fecha' | 'total' | 'saldo_pendiente' | 'proveedor_id'>

type FacturaPendiente = {
  id:      string
  numero:  string
  saldo:   number
  esVenta: boolean
}

type Imputacion = FacturaPendiente & {
  monto_imputado: number
  checked:        boolean
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
  const [fecha, setFecha]             = useState(hoy())
  const [notas, setNotas]             = useState('')
  // Sólo se guardan los ajustes que hace la persona sobre la distribución
  // automática, indexados por id de factura. La lista de imputaciones en sí
  // se deriva en el render: antes vivía en estado y se recalculaba desde dos
  // useEffect que llamaban a setState en el cuerpo del efecto, lo que provoca
  // renders en cascada (y es justo lo que marca react-hooks/set-state-in-effect).
  const [desmarcadas, setDesmarcadas]           = useState<Record<string, boolean>>({})
  const [montosManuales, setMontosManuales]     = useState<Record<string, number>>({})
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const esCobro  = tipo === 'COBRO_CLIENTE'
  const titulo   = esCobro ? 'Nuevo cobro a cliente' : 'Nuevo pago a proveedor'
  const montoNum = typeof monto === 'number' ? monto : 0

  // Facturas con saldo de la entidad elegida.
  const pendientes: FacturaPendiente[] = useMemo(() => {
    if (!entidadId) return []
    return esCobro
      ? facturasVenta
          .filter((f) => f.cliente_id === entidadId && f.saldo_pendiente > 0)
          .map((f) => ({ id: f.id, numero: f.numero, saldo: f.saldo_pendiente, esVenta: true }))
      : facturasCompra
          .filter((f) => f.proveedor_id === entidadId && f.saldo_pendiente > 0)
          .map((f) => ({ id: f.id, numero: f.numero, saldo: f.saldo_pendiente, esVenta: false }))
  }, [entidadId, esCobro, facturasVenta, facturasCompra])

  // El monto se reparte de la más vieja a la más nueva, salvo donde la persona
  // haya escrito un importe a mano.
  const imputaciones: Imputacion[] = useMemo(() => {
    const filas: Imputacion[] = []
    let restante = montoNum

    for (const f of pendientes) {
      if (desmarcadas[f.id]) {
        filas.push({ ...f, checked: false, monto_imputado: 0 })
        continue
      }
      const manual = montosManuales[f.id]
      const asignado = manual !== undefined
        ? Math.min(manual, f.saldo)
        : Math.min(f.saldo, restante)
      restante = Math.max(0, restante - asignado)
      filas.push({ ...f, checked: true, monto_imputado: asignado })
    }

    return filas
  }, [pendientes, montoNum, desmarcadas, montosManuales])

  const totalImputado = imputaciones.reduce((s, i) => s + i.monto_imputado, 0)
  const totalPendiente = pendientes
    .filter((f) => !desmarcadas[f.id])
    .reduce((s, f) => s + f.saldo, 0)
  const excede = totalImputado > montoNum + 0.01

  function cambiarEntidad(id: string) {
    setEntidadId(id)
    // Los ajustes manuales son de la entidad anterior.
    setDesmarcadas({})
    setMontosManuales({})
  }

  function toggleImputacion(id: string) {
    setDesmarcadas((prev) => ({ ...prev, [id]: !prev[id] }))
    setMontosManuales(({ [id]: _quitado, ...resto }) => resto)
  }

  function updateMontoImputado(id: string, val: number) {
    setMontosManuales((prev) => ({ ...prev, [id]: Math.max(0, val) }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!entidadId) { setError(esCobro ? 'Seleccioná un cliente.' : 'Seleccioná un proveedor.'); return }
    if (!montoNum || montoNum <= 0) { setError('Ingresá el monto.'); return }
    if (excede) { setError('El total imputado supera el monto del pago.'); return }

    setLoading(true)
    const r = await registrarPago({
      tipo,
      ...(esCobro ? { cliente_id: entidadId } : { proveedor_id: entidadId }),
      monto:       montoNum,
      medio_pago:  medioPago,
      fecha,
      notas:       notas || null,
      imputaciones: imputaciones
        .filter((i) => i.checked && i.monto_imputado > 0)
        .map((i) => ({
          ...(i.esVenta ? { factura_venta_id: i.id } : { factura_compra_id: i.id }),
          monto_imputado: i.monto_imputado,
        })),
    })
    setLoading(false)
    if (!r.ok) { setError(r.error); return }
    onSaved()
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
                onChange={(e) => cambiarEntidad(e.target.value)}
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
                {totalPendiente > 0 && (
                  <button
                    type="button"
                    onClick={() => { setMontosManuales({}); setMonto(totalPendiente) }}
                    className="mt-1 text-xs text-blue-600 hover:underline"
                  >
                    Cancelar todo ({formatCurrency(totalPendiente)})
                  </button>
                )}
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
                      {imputaciones.map((imp) => (
                        <tr key={imp.id} className={imp.checked ? '' : 'opacity-50'}>
                          <td className="table-td text-center">
                            <input
                              type="checkbox"
                              checked={imp.checked}
                              onChange={() => toggleImputacion(imp.id)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                          </td>
                          <td className="table-td font-mono text-xs">{imp.numero}</td>
                          <td className="table-td text-right text-gray-500">{formatCurrency(imp.saldo)}</td>
                          <td className="table-td text-right">
                            <input
                              type="number" step="0.01" min="0"
                              value={imp.monto_imputado}
                              onChange={(e) => updateMontoImputado(imp.id, parseFloat(e.target.value) || 0)}
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
