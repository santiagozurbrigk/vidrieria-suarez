'use client'

import { useState } from 'react'
import type { Cliente, Producto, FacturaVenta, ResumenVentas } from '@/lib/supabase/types'
import { avisoListadoParcial, type NoNulo } from '@/lib/paginacion'
import FacturaVentaModal from './FacturaVentaModal'
import CobroModal from './CobroModal'
import { exportarExcel } from '@/lib/exportar'
import { hoy } from '@/lib/fechas'
import { useRouter } from 'next/navigation'

type ItemConProducto = {
  id: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  productos: { nombre: string; unidad_medida: string } | null
}

type FacturaConCliente = FacturaVenta & {
  clientes:             { nombre: string; apellido: string | null; razon_social: string | null } | null
  factura_venta_items:  ItemConProducto[]
}

type ClienteSlim  = Pick<Cliente,  'id' | 'nombre' | 'apellido' | 'razon_social'>
type ProductoSlim = Pick<Producto, 'id' | 'nombre' | 'unidad_medida' | 'precio_venta' | 'stock_actual'>

type Props = {
  facturas:   FacturaConCliente[]
  totalFilas: number | null
  resumen:    NoNulo<ResumenVentas>
  clientes:   ClienteSlim[]
  productos:  ProductoSlim[]
}

type Filtro = 'TODAS' | 'PENDIENTE' | 'PARCIAL' | 'PAGADA'

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE:  'bg-yellow-100 text-yellow-800',
  PARCIAL:    'bg-blue-100   text-blue-800',
  PAGADA:     'bg-green-100  text-green-800',
}
const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  PARCIAL:   'Parcial',
  PAGADA:    'Pagada',
}

const UNIDADES: Record<string, string> = { UNIDAD: 'und.', M2: 'm²', ML: 'ml' }

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

function clienteLabel(c: { nombre: string; apellido: string | null; razon_social: string | null } | null) {
  if (!c) return '—'
  if (c.razon_social) return c.razon_social
  return [c.nombre, c.apellido].filter(Boolean).join(' ')
}

export default function VentasClient({ facturas: initial, totalFilas, resumen, clientes, productos }: Props) {
  const router = useRouter()
  const facturas = initial
  const [filtro, setFiltro]       = useState<Filtro>('TODAS')
  const [busqueda, setBusqueda]   = useState('')
  const [showModal, setShowModal] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [cobroFactura, setCobroFactura] = useState<FacturaConCliente | null>(null)

  const filtradas = facturas.filter((f) => {
    const matchEstado  = filtro === 'TODAS' || f.estado === filtro
    const matchBusqueda = busqueda === '' ||
      f.numero.toLowerCase().includes(busqueda.toLowerCase()) ||
      clienteLabel(f.clientes).toLowerCase().includes(busqueda.toLowerCase())
    return matchEstado && matchBusqueda
  })

  // Los contadores y los totales vienen de la base: contar el array cargado
  // daría los números de la página, no los del negocio.
  const totalesPor: Record<Filtro, number> = {
    TODAS:     resumen.cantidad,
    PENDIENTE: resumen.pendientes,
    PARCIAL:   resumen.parciales,
    PAGADA:    resumen.pagadas,
  }

  const totalFacturado = resumen.total_facturado
  const totalPendiente = resumen.total_pendiente
  const aviso = avisoListadoParcial(facturas.length, totalFilas)

  function onSaved() {
    setShowModal(false)
    router.refresh()
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <>
      <div>
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Facturas de venta</h1>
            <p className="text-sm text-gray-500 mt-1">
              Registrá ventas a clientes. El stock se descuenta automáticamente.
            </p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary shrink-0">
            + Nueva factura
          </button>
        </div>

        {aviso && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {aviso}
          </p>
        )}

        {/* Tarjetas resumen */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total facturado</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(totalFacturado)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{resumen.cantidad} facturas</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Por cobrar</p>
            <p className={`mt-1 text-2xl font-bold ${totalPendiente > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {totalPendiente > 0 ? formatCurrency(totalPendiente) : '✓ Al día'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{totalesPor.PENDIENTE + totalesPor.PARCIAL} abiertas</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cobradas</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{totalesPor.PAGADA}</p>
            <p className="text-xs text-gray-400 mt-0.5">de {resumen.cantidad} facturas</p>
          </div>
        </div>

        {/* Filtros + búsqueda */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              const rows = filtradas.map((f) => ({
                'Número':          f.numero,
                'Fecha':           f.fecha,
                'Cliente':         clienteLabel(f.clientes),
                'Total':           f.total,
                'Saldo pendiente': f.saldo_pendiente,
                'Estado':          ESTADO_LABEL[f.estado] ?? f.estado,
              }))
              exportarExcel(rows, 'Ventas', `ventas-${hoy()}`)
            }}
            className="btn-secondary text-sm"
          >
            ↓ Exportar Excel
          </button>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {(['TODAS', 'PENDIENTE', 'PARCIAL', 'PAGADA'] as Filtro[]).map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  filtro === f
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {f === 'TODAS' ? 'Todas' : ESTADO_LABEL[f]}
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                  filtro === f ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  {totalesPor[f]}
                </span>
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Buscar por número o cliente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="input w-64"
          />
        </div>

        {/* Tabla */}
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="table-th w-6"></th>
                  <th className="table-th">Número</th>
                  <th className="table-th">Fecha</th>
                  <th className="table-th">Cliente</th>
                  <th className="table-th text-right">Total</th>
                  <th className="table-th text-right">Saldo pendiente</th>
                  <th className="table-th">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtradas.map((f) => {
                  const isExpanded = expandedId === f.id
                  const items = f.factura_venta_items ?? []
                  return (
                    <>
                      <tr
                        key={f.id}
                        className={`transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                        onClick={() => toggleExpand(f.id)}
                      >
                        <td className="table-td text-gray-400 text-xs text-center select-none">
                          {items.length > 0 ? (isExpanded ? '▾' : '▸') : ''}
                        </td>
                        <td className="table-td font-mono text-sm font-medium text-gray-900">{f.numero}</td>
                        <td className="table-td text-gray-500 text-sm">{f.fecha}</td>
                        <td className="table-td font-medium text-gray-900">{clienteLabel(f.clientes)}</td>
                        <td className="table-td text-right font-semibold">{formatCurrency(f.total)}</td>
                        <td className={`table-td text-right font-semibold ${f.saldo_pendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {f.saldo_pendiente > 0 ? formatCurrency(f.saldo_pendiente) : '✓ Cobrada'}
                        </td>
                        <td className="table-td">
                          <span className={`badge ${ESTADO_BADGE[f.estado] ?? 'bg-gray-100 text-gray-700'}`}>
                            {ESTADO_LABEL[f.estado] ?? f.estado}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${f.id}-items`} className="bg-blue-50">
                          <td colSpan={7} className="px-8 py-3">
                            {items.length > 0 && (
                              <table className="w-full text-sm mb-3">
                                <thead>
                                  <tr className="text-left text-xs text-blue-700 border-b border-blue-100">
                                    <th className="pb-1.5 font-medium">Producto</th>
                                    <th className="pb-1.5 font-medium text-right">Cantidad</th>
                                    <th className="pb-1.5 font-medium text-right">Precio unit.</th>
                                    <th className="pb-1.5 font-medium text-right">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.map((item) => (
                                    <tr key={item.id} className="border-b border-blue-50 last:border-0">
                                      <td className="py-1.5 text-gray-800 font-medium">
                                        {item.productos?.nombre ?? '—'}
                                      </td>
                                      <td className="py-1.5 text-right text-gray-600">
                                        {item.cantidad} {item.productos ? UNIDADES[item.productos.unidad_medida] ?? item.productos.unidad_medida : ''}
                                      </td>
                                      <td className="py-1.5 text-right text-gray-600">
                                        {formatCurrency(item.precio_unitario)}
                                      </td>
                                      <td className="py-1.5 text-right font-semibold text-gray-900">
                                        {formatCurrency(item.subtotal)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                            {/* Acciones de la factura */}
                            <div className="flex items-center gap-3 pt-1 border-t border-blue-100">
                              {f.estado !== 'PAGADA' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setCobroFactura(f) }}
                                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700"
                                >
                                  💰 Registrar cobro
                                </button>
                              )}
                              <a
                                href={`/imprimir/factura/${f.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs text-gray-500 hover:text-gray-800"
                              >
                                🖨️ Imprimir factura
                              </a>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
                {filtradas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-gray-400">
                      No hay facturas {filtro !== 'TODAS' ? `en estado "${ESTADO_LABEL[filtro]}"` : ''}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-400 text-right">Hacé clic en una fila para ver el detalle de ítems.</p>
      </div>

      {showModal && (
        <FacturaVentaModal
          clientes={clientes}
          productos={productos}
          onSaved={onSaved}
          onClose={() => setShowModal(false)}
        />
      )}

      {cobroFactura && (
        <CobroModal
          factura={cobroFactura}
          onSaved={() => { setCobroFactura(null); router.refresh() }}
          onClose={() => setCobroFactura(null)}
        />
      )}
    </>
  )
}
