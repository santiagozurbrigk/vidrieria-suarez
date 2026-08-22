'use client'

import { useState } from 'react'
import type { Remito } from '@/lib/supabase/types'
import RemitoModal from './RemitoModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { actualizarEstadoRemito, eliminarRemito } from '@/lib/actions/remitos'

type RemitoConRelaciones = Remito & {
  clientes:       { nombre: string; apellido: string | null; razon_social: string | null } | null
  facturas_venta: { numero: string } | null
}

type ClienteSlim = { id: string; nombre: string; apellido: string | null; razon_social: string | null }
type FacturaSlim = { id: string; numero: string; cliente_id: string; total: number }

type Props = {
  remitos:       RemitoConRelaciones[]
  clientes:      ClienteSlim[]
  facturasVenta: FacturaSlim[]
}

type Filtro = 'TODOS' | 'PENDIENTE' | 'ENTREGADO' | 'CANCELADO'

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE:  'bg-yellow-100 text-yellow-800',
  ENTREGADO:  'bg-green-100  text-green-800',
  CANCELADO:  'bg-red-100    text-red-800',
}
const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE:  'Pendiente',
  ENTREGADO:  'Entregado',
  CANCELADO:  'Cancelado',
}

function clienteLabel(c: { nombre: string; apellido: string | null; razon_social: string | null } | null) {
  if (!c) return '—'
  if (c.razon_social) return c.razon_social
  return [c.nombre, c.apellido].filter(Boolean).join(' ')
}

export default function RemitosClient({ remitos, clientes, facturasVenta }: Props) {
  const [filtro,    setFiltro]    = useState<Filtro>('TODOS')
  const [busqueda,  setBusqueda]  = useState('')
  const [showModal,    setShowModal]    = useState(false)
  const [updating,     setUpdating]     = useState<string | null>(null)
  const [deleteRemito, setDeleteRemito] = useState<RemitoConRelaciones | null>(null)
  const [deleting,     setDeleting]     = useState(false)

  const filtrados = remitos.filter((r) => {
    const matchEstado   = filtro === 'TODOS' || r.estado === filtro
    const matchBusqueda = busqueda === '' ||
      r.numero.toLowerCase().includes(busqueda.toLowerCase()) ||
      clienteLabel(r.clientes).toLowerCase().includes(busqueda.toLowerCase())
    return matchEstado && matchBusqueda
  })

  const totalesPor: Record<Filtro, number> = {
    TODOS:     remitos.length,
    PENDIENTE: remitos.filter((r) => r.estado === 'PENDIENTE').length,
    ENTREGADO: remitos.filter((r) => r.estado === 'ENTREGADO').length,
    CANCELADO: remitos.filter((r) => r.estado === 'CANCELADO').length,
  }

  async function cambiarEstado(id: string, estado: string) {
    setUpdating(id)
    try {
      await actualizarEstadoRemito(id, estado)
      window.location.reload()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al actualizar')
      setUpdating(null)
    }
  }

  function onSaved() {
    setShowModal(false)
    window.location.reload()
  }

  async function handleDelete() {
    if (!deleteRemito) return
    setDeleting(true)
    try {
      await eliminarRemito(deleteRemito.id)
      setDeleteRemito(null)
      window.location.reload()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar')
      setDeleting(false)
    }
  }

  return (
    <>
      <div>
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Remitos</h1>
            <p className="text-sm text-gray-500 mt-1">
              Comprobantes de entrega de mercadería a clientes.
            </p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary shrink-0">
            + Nuevo remito
          </button>
        </div>

        {/* Tarjetas resumen */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{remitos.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">remitos registrados</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pendientes</p>
            <p className={`mt-1 text-3xl font-bold ${totalesPor.PENDIENTE > 0 ? 'text-yellow-600' : 'text-gray-900'}`}>
              {totalesPor.PENDIENTE}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">por entregar</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Entregados</p>
            <p className="mt-1 text-3xl font-bold text-green-600">{totalesPor.ENTREGADO}</p>
            <p className="text-xs text-gray-400 mt-0.5">completados</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {/* Estado */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {(['TODOS', 'PENDIENTE', 'ENTREGADO', 'CANCELADO'] as Filtro[]).map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  filtro === f ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {f === 'TODOS' ? 'Todos' : ESTADO_LABEL[f]}
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                  filtro === f ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  {totalesPor[f]}
                </span>
              </button>
            ))}
          </div>

          {/* Búsqueda */}
          <input
            type="text"
            placeholder="Buscar por número o cliente…"
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
                  <th className="table-th">Factura vinculada</th>
                  <th className="table-th">Estado</th>
                  <th className="table-th">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrados.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td font-mono text-sm font-medium text-gray-900">{r.numero}</td>
                    <td className="table-td text-gray-500 text-sm">{r.fecha}</td>
                    <td className="table-td font-medium text-gray-900">{clienteLabel(r.clientes)}</td>
                    <td className="table-td text-gray-500 text-sm">
                      {r.facturas_venta
                        ? <span className="font-mono">{r.facturas_venta.numero}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="table-td">
                      <span className={`badge ${ESTADO_BADGE[r.estado] ?? 'bg-gray-100 text-gray-700'}`}>
                        {ESTADO_LABEL[r.estado] ?? r.estado}
                      </span>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        {r.estado === 'PENDIENTE' && (
                          <>
                            <button
                              onClick={() => cambiarEstado(r.id, 'ENTREGADO')}
                              disabled={updating === r.id}
                              className="text-xs font-medium text-green-600 hover:text-green-800 disabled:opacity-50"
                            >
                              {updating === r.id ? '…' : '✓ Entregado'}
                            </button>
                            <span className="text-gray-200">|</span>
                            <button
                              onClick={() => cambiarEstado(r.id, 'CANCELADO')}
                              disabled={updating === r.id}
                              className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
                            >
                              Cancelar
                            </button>
                          </>
                        )}
                        {r.estado !== 'PENDIENTE' && (
                          <span className="text-xs text-gray-300 mr-2">—</span>
                        )}
                        <a
                          href={`/imprimir/remito/${r.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-400 hover:text-gray-700"
                          title="Imprimir / PDF"
                        >
                          🖨️
                        </a>
                        <button
                          onClick={() => setDeleteRemito(r)}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                      No hay remitos {filtro !== 'TODOS' ? `en estado "${ESTADO_LABEL[filtro]}"` : 'registrados'}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {deleteRemito && (
        <ConfirmDialog
          title="Eliminar remito"
          message={`¿Eliminás el remito ${deleteRemito.numero}? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          variant="danger"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteRemito(null)}
        />
      )}

      {showModal && (
        <RemitoModal
          clientes={clientes}
          facturasVenta={facturasVenta}
          onSaved={onSaved}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
