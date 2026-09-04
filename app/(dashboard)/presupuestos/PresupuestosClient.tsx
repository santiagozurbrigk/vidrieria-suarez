'use client'

import { useState } from 'react'
import type { Arquitecto, Cliente, Producto, Presupuesto } from '@/lib/supabase/types'
import PresupuestoModal from './PresupuestoModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { actualizarEstadoPresupuesto, convertirPresupuestoEnFactura, eliminarPresupuesto } from '@/lib/actions/presupuestos'
import { useRouter } from 'next/navigation'
import { avisoListadoParcial } from '@/lib/paginacion'
import type { ResumenPresupuestos } from '@/lib/supabase/types'

type PresupuestoConRelaciones = Presupuesto & {
  arquitectos: { nombre: string; apellido: string | null; estudio: string | null } | null
  clientes:    { nombre: string; apellido: string | null; razon_social: string | null } | null
}

type ArquitectoSlim = Pick<Arquitecto, 'id' | 'nombre' | 'apellido' | 'estudio'>
type ClienteSlim    = Pick<Cliente,    'id' | 'nombre' | 'apellido' | 'razon_social'>
type ProductoSlim   = Pick<Producto,   'id' | 'nombre' | 'unidad_medida' | 'precio_venta'>

type Props = {
  presupuestos: PresupuestoConRelaciones[]
  totalFilas:   number | null
  resumen:      ResumenPresupuestos
  arquitectos:  ArquitectoSlim[]
  clientes:     ClienteSlim[]
  productos:    ProductoSlim[]
}

type Filtro = 'TODOS' | 'BORRADOR' | 'ENVIADO' | 'APROBADO' | 'RECHAZADO' | 'CONVERTIDO'

const ESTADO_BADGE: Record<string, string> = {
  BORRADOR:   'bg-gray-100 text-gray-700',
  ENVIADO:    'bg-blue-100 text-blue-800',
  APROBADO:   'bg-green-100 text-green-800',
  RECHAZADO:  'bg-red-100 text-red-800',
  CONVERTIDO: 'bg-purple-100 text-purple-800',
}

const ESTADO_LABEL: Record<string, string> = {
  BORRADOR:   'Borrador',
  ENVIADO:    'Enviado',
  APROBADO:   'Aprobado',
  RECHAZADO:  'Rechazado',
  CONVERTIDO: 'Convertido',
}

const ESTADOS_TRANSICION: Record<string, string[]> = {
  BORRADOR:   ['ENVIADO', 'RECHAZADO'],
  ENVIADO:    ['APROBADO', 'RECHAZADO', 'BORRADOR'],
  APROBADO:   ['RECHAZADO'],
  RECHAZADO:  ['BORRADOR'],
  CONVERTIDO: [],
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

function arquitectoLabel(a: { nombre: string; apellido: string | null; estudio: string | null } | null) {
  if (!a) return '—'
  const nombre = [a.nombre, a.apellido].filter(Boolean).join(' ')
  return a.estudio ? `${nombre} (${a.estudio})` : nombre
}

function clienteLabel(c: { nombre: string; apellido: string | null; razon_social: string | null } | null) {
  if (!c) return '—'
  if (c.razon_social) return c.razon_social
  return [c.nombre, c.apellido].filter(Boolean).join(' ')
}

export default function PresupuestosClient({ presupuestos: initial, totalFilas, resumen, arquitectos, clientes, productos }: Props) {
  const aviso = avisoListadoParcial(initial.length, totalFilas)
  const router = useRouter()
  const [accionError, setAccionError] = useState<string | null>(null)
  const presupuestos = initial
  const [filtro, setFiltro]             = useState<Filtro>('TODOS')
  const [busqueda, setBusqueda]         = useState('')
  const [showModal, setShowModal]       = useState(false)
  const [loadingId, setLoadingId]       = useState<string | null>(null)
  const [convertirId, setConvertirId]   = useState<string | null>(null)
  const [numeroFactura, setNumeroFactura] = useState('')
  const [convertError, setConvertError] = useState<string | null>(null)
  const [deleteId,    setDeleteId]      = useState<string | null>(null)
  const [deleting,    setDeleting]      = useState(false)

  const filtrados = presupuestos.filter((p) => {
    const matchEstado  = filtro === 'TODOS' || p.estado === filtro
    const matchBusqueda = busqueda === '' ||
      p.numero.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.obra ?? '').toLowerCase().includes(busqueda.toLowerCase()) ||
      arquitectoLabel(p.arquitectos).toLowerCase().includes(busqueda.toLowerCase()) ||
      clienteLabel(p.clientes).toLowerCase().includes(busqueda.toLowerCase())
    return matchEstado && matchBusqueda
  })

  const totalesPor: Record<Filtro, number> = {
    TODOS:      presupuestos.length,
    BORRADOR:   resumen.borradores,
    ENVIADO:    resumen.enviados,
    APROBADO:   resumen.aprobados,
    RECHAZADO:  resumen.rechazados,
    CONVERTIDO: resumen.convertidos,
  }

  async function cambiarEstado(id: string, nuevoEstado: string) {
    setLoadingId(id)
    const r = await actualizarEstadoPresupuesto(id, nuevoEstado)
    setLoadingId(null)
    if (!r.ok) { setAccionError(r.error); return }
    setAccionError(null)
    router.refresh()
  }

  async function handleConvertir(e: React.FormEvent) {
    e.preventDefault()
    if (!convertirId || !numeroFactura.trim()) return
    setLoadingId(convertirId)
    setConvertError(null)
    const r = await convertirPresupuestoEnFactura(convertirId, numeroFactura.trim())
    setLoadingId(null)
    if (!r.ok) { setConvertError(r.error); return }
    setConvertirId(null)
    setNumeroFactura('')
    router.refresh()
  }

  function onSaved() {
    setShowModal(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    const r = await eliminarPresupuesto(deleteId)
    setDeleting(false)
    if (!r.ok) { setAccionError(r.error); return }
    setDeleteId(null)
    router.refresh()
  }

  const FILTROS: Filtro[] = ['TODOS', 'BORRADOR', 'ENVIADO', 'APROBADO', 'RECHAZADO', 'CONVERTIDO']

  return (
    <>
      <div>
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Presupuestos</h1>
            <p className="text-sm text-gray-500 mt-1">
              Presupuestos para arquitectos. Los aprobados se pueden convertir en facturas de venta.
            </p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary shrink-0">
            + Nuevo presupuesto
          </button>
        </div>
        {aviso && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {aviso}
          </p>
        )}
        {accionError && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {accionError}
          </p>
        )}


        {/* Filtros + búsqueda */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm flex-wrap">
            {FILTROS.map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  filtro === f
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
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
          <input
            type="text"
            placeholder="Buscar por número, obra o arquitecto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="input w-72"
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
                  <th className="table-th">Arquitecto</th>
                  <th className="table-th">Cliente / Obra</th>
                  <th className="table-th text-right">Total</th>
                  <th className="table-th">Estado</th>
                  <th className="table-th">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrados.map((p) => {
                  const transiciones = ESTADOS_TRANSICION[p.estado] ?? []
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-td font-mono text-sm font-medium text-gray-900">{p.numero}</td>
                      <td className="table-td text-gray-500 text-sm">
                        {p.fecha}
                        <span className="block text-xs text-gray-400">
                          {p.validez_dias}d validez
                        </span>
                      </td>
                      <td className="table-td font-medium text-gray-900">{arquitectoLabel(p.arquitectos)}</td>
                      <td className="table-td text-gray-600 text-sm">
                        {clienteLabel(p.clientes)}
                        {p.obra && <span className="block text-xs text-gray-400">{p.obra}</span>}
                      </td>
                      <td className="table-td text-right font-semibold">{formatCurrency(p.total)}</td>
                      <td className="table-td">
                        <span className={`badge ${ESTADO_BADGE[p.estado] ?? 'bg-gray-100 text-gray-700'}`}>
                          {ESTADO_LABEL[p.estado] ?? p.estado}
                        </span>
                      </td>
                      <td className="table-td">
                        <div className="flex items-center gap-2 flex-wrap">
                          {transiciones.map((nuevoEstado) => (
                            <button
                              key={nuevoEstado}
                              disabled={loadingId === p.id}
                              onClick={() => cambiarEstado(p.id, nuevoEstado)}
                              className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                            >
                              → {ESTADO_LABEL[nuevoEstado]}
                            </button>
                          ))}
                          {p.estado === 'APROBADO' && (
                            <button
                              disabled={loadingId === p.id}
                              onClick={() => { setConvertirId(p.id); setNumeroFactura(''); setConvertError(null) }}
                              className="text-xs px-2 py-1 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                            >
                              Convertir en factura
                            </button>
                          )}
                          {p.estado === 'CONVERTIDO' && p.convertido_en_factura_id && (
                            <span className="text-xs text-purple-600 font-medium">✓ Facturado</span>
                          )}
                          <a
                            href={`/imprimir/presupuesto/${p.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-400 hover:text-gray-700 ml-1"
                            title="Imprimir / PDF"
                          >
                            🖨️
                          </a>
                          {['BORRADOR', 'RECHAZADO'].includes(p.estado) && (
                            <button
                              onClick={() => setDeleteId(p.id)}
                              className="text-xs text-red-400 hover:text-red-600 ml-1"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-gray-400">
                      No hay presupuestos {filtro !== 'TODOS' ? `en estado "${ESTADO_LABEL[filtro]}"` : ''}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal nuevo presupuesto */}
      {showModal && (
        <PresupuestoModal
          arquitectos={arquitectos}
          clientes={clientes}
          productos={productos}
          onSaved={onSaved}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Confirm eliminar */}
      {deleteId && (
        <ConfirmDialog
          title="Eliminar presupuesto"
          message="¿Eliminás este presupuesto? Se eliminarán también sus ítems. Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          variant="danger"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {/* Modal convertir en factura */}
      {convertirId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Convertir en factura de venta</h2>
            <form onSubmit={handleConvertir} className="space-y-4">
              <div>
                <label className="label">Número de factura *</label>
                <input
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                  required
                  className="input"
                  placeholder="0001-00000001"
                  autoFocus
                />
              </div>
              {convertError && (
                <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{convertError}</p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setConvertirId(null)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={loadingId !== null} className="btn-primary">
                  {loadingId ? 'Convirtiendo...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
