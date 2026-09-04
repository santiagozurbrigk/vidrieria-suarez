'use client'

import { useState } from 'react'
import type { FacturaCompra } from '@/lib/supabase/types'
import { avisoListadoParcial } from '@/lib/paginacion'
import type { ResumenCompras } from '@/lib/supabase/types'

type FacturaConProveedor = FacturaCompra & {
  proveedores: { razon_social: string } | null
}

type ProveedorSlim = { id: string; razon_social: string }

type Props = {
  facturas:    FacturaConProveedor[]
  totalFilas:  number | null
  resumen:     ResumenCompras
  proveedores: ProveedorSlim[]
}

type Filtro = 'TODAS' | 'PENDIENTE' | 'PARCIAL' | 'PAGADA'

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-800',
  PARCIAL:   'bg-blue-100   text-blue-800',
  PAGADA:    'bg-green-100  text-green-800',
}
const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  PARCIAL:   'Parcial',
  PAGADA:    'Pagada',
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

export default function ComprasClient({ facturas, totalFilas, resumen, proveedores }: Props) {
  const aviso = avisoListadoParcial(facturas.length, totalFilas)
  const [filtro, setFiltro]       = useState<Filtro>('TODAS')
  const [provId, setProvId]       = useState<string>('TODOS')
  const [busqueda, setBusqueda]   = useState('')

  const filtradas = facturas.filter((f) => {
    const matchEstado    = filtro === 'TODAS' || f.estado === filtro
    const matchProveedor = provId === 'TODOS' || f.proveedor_id === provId
    const matchBusqueda  = busqueda === '' ||
      f.numero.toLowerCase().includes(busqueda.toLowerCase()) ||
      (f.proveedores?.razon_social ?? '').toLowerCase().includes(busqueda.toLowerCase())
    return matchEstado && matchProveedor && matchBusqueda
  })

  // Contadores y totales calculados en la base, no sobre el array cargado.
  const totalesPor: Record<Filtro, number> = {
    TODAS:     facturas.length,
    PENDIENTE: resumen.pendientes,
    PARCIAL:   resumen.parciales,
    PAGADA:    resumen.pagadas,
  }

  // Totales del período filtrado
  const totalFacturado  = filtradas.reduce((s, f) => s + f.total, 0)
  const totalPendiente  = filtradas.reduce((s, f) => s + f.saldo_pendiente, 0)

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturas de compra</h1>
          <p className="text-sm text-gray-500 mt-1">
            Historial de compras a proveedores registradas vía escaneo de factura.
          </p>
        </div>
      </div>

      {aviso && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {aviso}
        </p>
      )}

      {/* Tarjetas resumen */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total compras</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(resumen.total_facturado)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{facturas.length} facturas</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Por pagar</p>
          <p className={`mt-1 text-2xl font-bold ${resumen.total_pendiente > 0 ? 'text-orange-600' : 'text-green-600'}`}>
            {formatCurrency(resumen.total_pendiente)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{totalesPor.PENDIENTE + totalesPor.PARCIAL} abiertas</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Selección</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(totalFacturado)}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {filtradas.length} factura{filtradas.length !== 1 ? 's' : ''} · pendiente {formatCurrency(totalPendiente)}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Estado */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {(['TODAS', 'PENDIENTE', 'PARCIAL', 'PAGADA'] as Filtro[]).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 font-medium transition-colors ${
                filtro === f ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
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

        {/* Proveedor */}
        <select
          value={provId}
          onChange={(e) => setProvId(e.target.value)}
          className="input w-52 text-sm"
        >
          <option value="TODOS">Todos los proveedores</option>
          {proveedores.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
        </select>

        {/* Búsqueda */}
        <input
          type="text"
          placeholder="Buscar por número o proveedor..."
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
                <th className="table-th">Proveedor</th>
                <th className="table-th">Tipo</th>
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
                  <td className="table-td font-medium text-gray-900">{f.proveedores?.razon_social ?? '—'}</td>
                  <td className="table-td text-gray-500 text-sm">{f.tipo_comprobante}</td>
                  <td className="table-td text-right font-semibold">{formatCurrency(f.total)}</td>
                  <td className={`table-td text-right font-semibold ${f.saldo_pendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {f.saldo_pendiente > 0 ? formatCurrency(f.saldo_pendiente) : '✓ Pagada'}
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
                  <td colSpan={7} className="py-12 text-center text-sm text-gray-400">
                    No hay facturas {filtro !== 'TODAS' ? `en estado "${ESTADO_LABEL[filtro]}"` : ''}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
