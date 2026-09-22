'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Obra } from '@/lib/supabase/types'
import { archivarObra } from '@/lib/actions/obras'
import { avisoListadoParcial } from '@/lib/paginacion'
import ObraModal, { arquitectoLabel, clienteLabel } from './ObraModal'

type ArquitectoSlim = { id: string; nombre: string; apellido: string | null; estudio: string | null }
type ClienteSlim    = { id: string; nombre: string; apellido: string | null; razon_social: string | null }

type ObraConRelaciones = Obra & {
  arquitectos:  Omit<ArquitectoSlim, 'id'> | null
  clientes:     Omit<ClienteSlim, 'id'> | null
  // Sólo se usa para contar cuántos presupuestos cuelgan de la obra.
  presupuestos: { id: string }[]
}

type Props = {
  obras:       ObraConRelaciones[]
  totalFilas:  number | null
  arquitectos: ArquitectoSlim[]
  clientes:    ClienteSlim[]
}

export default function ObrasClient({ obras, totalFilas, arquitectos, clientes }: Props) {
  const router = useRouter()
  const [busqueda, setBusqueda]   = useState('')
  const [modal, setModal]         = useState<Obra | 'nueva' | null>(null)
  const [accionError, setAccionError] = useState<string | null>(null)
  const [archivando, setArchivando]   = useState<string | null>(null)

  const aviso = avisoListadoParcial(obras.length, totalFilas)

  const filtradas = obras.filter((o) => {
    if (busqueda === '') return true
    const q = busqueda.toLowerCase()
    return (
      o.nombre.toLowerCase().includes(q) ||
      (o.direccion ?? '').toLowerCase().includes(q) ||
      (o.arquitectos ? arquitectoLabel(o.arquitectos).toLowerCase().includes(q) : false) ||
      (o.clientes ? clienteLabel(o.clientes).toLowerCase().includes(q) : false)
    )
  })

  const activas = obras.filter((o) => o.activo).length

  async function cambiarArchivo(obra: ObraConRelaciones) {
    setArchivando(obra.id)
    const r = await archivarObra(obra.id, !obra.activo)
    setArchivando(null)
    if (!r.ok) { setAccionError(r.error); return }
    setAccionError(null)
    router.refresh()
  }

  function onSaved() {
    setModal(null)
    router.refresh()
  }

  return (
    <>
      <div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Obras</h1>
            <p className="mt-1 text-sm text-gray-500">
              Cada obra tiene su arquitecto. Los presupuestos se cargan contra una obra.
            </p>
          </div>
          <button onClick={() => setModal('nueva')} className="btn-primary shrink-0">
            + Nueva obra
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

        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Obras activas</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{activas}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Arquitectos</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {new Set(obras.filter((o) => o.activo).map((o) => o.arquitecto_id)).size}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Presupuestos</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {obras.reduce((s, o) => s + o.presupuestos.length, 0)}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por obra, arquitecto, cliente o dirección..."
            className="input w-80"
          />
        </div>

        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="table-th">Obra</th>
                  <th className="table-th">Arquitecto</th>
                  <th className="table-th">Cliente</th>
                  <th className="table-th text-right">Presupuestos</th>
                  <th className="table-th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtradas.map((o) => (
                  <tr key={o.id} className={`transition-colors hover:bg-gray-50 ${o.activo ? '' : 'opacity-50'}`}>
                    <td className="table-td">
                      <span className="font-medium text-gray-900">{o.nombre}</span>
                      {!o.activo && (
                        <span className="badge ml-2 bg-gray-100 text-xs text-gray-600">Archivada</span>
                      )}
                      {o.direccion && (
                        <span className="block text-xs text-gray-400">{o.direccion}</span>
                      )}
                    </td>
                    <td className="table-td text-gray-700">
                      {o.arquitectos ? arquitectoLabel(o.arquitectos) : '—'}
                    </td>
                    <td className="table-td text-gray-500">
                      {o.clientes ? clienteLabel(o.clientes) : <span className="text-gray-300">Sin asignar</span>}
                    </td>
                    <td className="table-td text-right">
                      {o.presupuestos.length > 0 ? (
                        <Link href="/presupuestos" className="text-blue-600 hover:underline">
                          {o.presupuestos.length}
                        </Link>
                      ) : (
                        <span className="text-gray-300">0</span>
                      )}
                    </td>
                    <td className="table-td">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => setModal(o)}
                          className="text-xs text-gray-500 hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => cambiarArchivo(o)}
                          disabled={archivando === o.id}
                          className="text-xs text-gray-400 hover:underline disabled:opacity-50"
                        >
                          {o.activo ? 'Archivar' : 'Reactivar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtradas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="table-td py-10 text-center text-gray-400">
                      {obras.length === 0
                        ? 'Todavía no hay obras cargadas.'
                        : 'Ninguna obra coincide con la búsqueda.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal && (
        <ObraModal
          obra={modal === 'nueva' ? null : modal}
          arquitectos={arquitectos}
          clientes={clientes}
          onSaved={onSaved}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}
