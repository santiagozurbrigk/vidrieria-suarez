'use client'

import { useState } from 'react'
import type { Cliente, Producto, FacturaVenta } from '@/lib/supabase/types'
import FacturaVentaModal from './FacturaVentaModal'

type FacturaConCliente = FacturaVenta & {
  clientes: { nombre: string; apellido: string | null; razon_social: string | null } | null
}

type ClienteSlim  = Pick<Cliente,  'id' | 'nombre' | 'apellido' | 'razon_social'>
type ProductoSlim = Pick<Producto, 'id' | 'nombre' | 'unidad_medida' | 'precio_venta' | 'stock_actual'>

type Props = {
  facturas:  FacturaConCliente[]
  clientes:  ClienteSlim[]
  productos: ProductoSlim[]
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

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

function clienteLabel(c: { nombre: string; apellido: string | null; razon_social: string | null } | null) {
  if (!c) return '—'
  if (c.razon_social) return c.razon_social
  return [c.nombre, c.apellido].filter(Boolean).join(' ')
}

export default function VentasClient({ facturas: initial, clientes, productos }: Props) {
  const [facturas, setFacturas]   = useState(initial)
  const [filtro, setFiltro]       = useState<Filtro>('TODAS')
  const [busqueda, setBusqueda]   = useState('')
  const [showModal, setShowModal] = useState(false)

  const filtradas = facturas.filter((f) => {
    const matchEstado  = filtro === 'TODAS' || f.estado === filtro
    const matchBusqueda = busqueda === '' ||
      f.numero.toLowerCase().includes(busqueda.toLowerCase()) ||
      clienteLabel(f.clientes).toLowerCase().includes(busqueda.toLowerCase())
    return matchEstado && matchBusqueda
  })

  const totalesPor: Record<Filtro, number> = {
    TODAS:     facturas.length,
    PENDIENTE: facturas.filter((f) => f.estado === 'PENDIENTE').length,
    PARCIAL:   facturas.filter((f) => f.estado === 'PARCIAL').length,
    PAGADA:    facturas.filter((f) => f.estado === 'PAGADA').length,
  }

  function onSaved() {
    setShowModal(false)
    window.location.reload()   // recarga para traer la nueva factura del servidor
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

        {/* Filtros + búsqueda */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
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
                  <th className="table-th">Número</th>
                  <th className="table-th">Fecha</th>
                  <th className="table-th">Cliente</th>
                  <th className="table-th text-right">Total</th>
                  <th className="table-th text-right">Saldo pendiente</th>
                  <th className="table-th">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtradas.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50 transition-colors">
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
                ))}
                {filtradas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                      No hay facturas {filtro !== 'TODAS' ? `en estado "${ESTADO_LABEL[filtro]}"` : ''}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <FacturaVentaModal
          clientes={clientes}
          productos={productos}
          onSaved={onSaved}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
