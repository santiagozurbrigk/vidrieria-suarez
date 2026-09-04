'use client'

import { useState } from 'react'
import type { Cliente, Proveedor, Pago, FacturaVenta, FacturaCompra } from '@/lib/supabase/types'
import PagoModal from './PagoModal'
import { useRouter } from 'next/navigation'
import { avisoListadoParcial, type NoNulo } from '@/lib/paginacion'
import type { ResumenPagos } from '@/lib/supabase/types'

type Tipo = 'COBRO_CLIENTE' | 'PAGO_PROVEEDOR'

type PagoConRelaciones = Pago & {
  clientes:    { nombre: string; apellido: string | null; razon_social: string | null } | null
  proveedores: { razon_social: string } | null
}

type ClienteSlim       = Pick<Cliente,      'id' | 'nombre' | 'apellido' | 'razon_social'>
type ProveedorSlim     = Pick<Proveedor,    'id' | 'razon_social'>
type FacturaVentaSlim  = Pick<FacturaVenta,  'id' | 'numero' | 'fecha' | 'total' | 'saldo_pendiente' | 'cliente_id'>
type FacturaCompraSlim = Pick<FacturaCompra, 'id' | 'numero' | 'fecha' | 'total' | 'saldo_pendiente' | 'proveedor_id'>

type Props = {
  pagos:          PagoConRelaciones[]
  totalFilas:     number | null
  resumen:        NoNulo<ResumenPagos>
  clientes:       ClienteSlim[]
  proveedores:    ProveedorSlim[]
  facturasVenta:  FacturaVentaSlim[]
  facturasCompra: FacturaCompraSlim[]
}

type Filtro = 'TODOS' | 'COBRO_CLIENTE' | 'PAGO_PROVEEDOR'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

function entidadLabel(p: PagoConRelaciones) {
  if (p.tipo === 'COBRO_CLIENTE') {
    const c = p.clientes
    if (!c) return '—'
    if (c.razon_social) return c.razon_social
    return [c.nombre, c.apellido].filter(Boolean).join(' ')
  }
  return p.proveedores?.razon_social ?? '—'
}

export default function PagosClient({ pagos: initial, totalFilas, resumen, clientes, proveedores, facturasVenta, facturasCompra }: Props) {
  const router = useRouter()
  const pagos = initial
  const [filtro, setFiltro]       = useState<Filtro>('TODOS')
  const [busqueda, setBusqueda]   = useState('')
  const [modalTipo, setModalTipo] = useState<Tipo | null>(null)

  const filtrados = pagos.filter((p) => {
    const matchFiltro   = filtro === 'TODOS' || p.tipo === filtro
    const matchBusqueda = busqueda === '' ||
      entidadLabel(p).toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.medio_pago ?? '').toLowerCase().includes(busqueda.toLowerCase())
    return matchFiltro && matchBusqueda
  })

  // Totales calculados en la base, no sobre el array cargado.
  const totalCobros = resumen.total_cobros
  const totalPagos  = resumen.total_pagos
  const aviso = avisoListadoParcial(pagos.length, totalFilas)

  function onSaved() {
    setModalTipo(null)
    router.refresh()
  }

  return (
    <>
      <div>
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pagos</h1>
            <p className="text-sm text-gray-500 mt-1">
              Cobros a clientes y pagos a proveedores. Se imputan a facturas y actualizan el saldo automáticamente.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setModalTipo('COBRO_CLIENTE')} className="btn-primary">
              + Cobro
            </button>
            <button
              onClick={() => setModalTipo('PAGO_PROVEEDOR')}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition-colors"
            >
              + Pago
            </button>
          </div>
        </div>

        {aviso && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {aviso}
          </p>
        )}

        {/* Tarjetas resumen */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="card p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total cobrado</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{formatCurrency(totalCobros)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{pagos.filter((p) => p.tipo === 'COBRO_CLIENTE').length} cobros</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total pagado</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{formatCurrency(totalPagos)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{pagos.filter((p) => p.tipo === 'PAGO_PROVEEDOR').length} pagos</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Balance neto</p>
            <p className={`mt-1 text-2xl font-bold ${totalCobros - totalPagos >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              {formatCurrency(totalCobros - totalPagos)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{pagos.length} movimientos</p>
          </div>
        </div>

        {/* Filtros + búsqueda */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {([['TODOS', 'Todos'], ['COBRO_CLIENTE', 'Cobros'], ['PAGO_PROVEEDOR', 'Pagos']] as [Filtro, string][]).map(([f, label]) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  filtro === f ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Buscar por entidad o medio..."
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
                  <th className="table-th">Fecha</th>
                  <th className="table-th">Tipo</th>
                  <th className="table-th">Entidad</th>
                  <th className="table-th">Medio de pago</th>
                  <th className="table-th text-right">Monto</th>
                  <th className="table-th">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrados.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td text-gray-500 text-sm">{p.fecha}</td>
                    <td className="table-td">
                      <span className={`badge ${p.tipo === 'COBRO_CLIENTE' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {p.tipo === 'COBRO_CLIENTE' ? 'Cobro' : 'Pago'}
                      </span>
                    </td>
                    <td className="table-td font-medium text-gray-900">{entidadLabel(p)}</td>
                    <td className="table-td text-gray-500 text-sm">{p.medio_pago}</td>
                    <td className={`table-td text-right font-semibold ${p.tipo === 'COBRO_CLIENTE' ? 'text-green-600' : 'text-orange-600'}`}>
                      {formatCurrency(p.monto)}
                    </td>
                    <td className="table-td text-gray-400 text-xs max-w-xs truncate">{p.notas ?? '—'}</td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                      No hay pagos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalTipo && (
        <PagoModal
          tipo={modalTipo}
          clientes={clientes}
          proveedores={proveedores}
          facturasVenta={facturasVenta}
          facturasCompra={facturasCompra}
          onSaved={onSaved}
          onClose={() => setModalTipo(null)}
        />
      )}
    </>
  )
}
