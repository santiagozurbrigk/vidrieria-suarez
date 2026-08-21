'use client'

import { useState } from 'react'
import type { Arquitecto } from '@/lib/supabase/types'
import ArquitectoModal from './ArquitectoModal'

type Props = { arquitectos: Arquitecto[] }

export default function ArquitectosClient({ arquitectos: initial }: Props) {
  const [arquitectos, setArquitectos] = useState(initial)
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState<Arquitecto | null | 'nuevo'>(null)

  const filtrados = arquitectos.filter((a) =>
    `${a.nombre} ${a.apellido ?? ''} ${a.estudio ?? ''}`.toLowerCase().includes(busqueda.toLowerCase())
  )

  function onSaved(a: Arquitecto) {
    setArquitectos((prev) => {
      const idx = prev.findIndex((x) => x.id === a.id)
      return idx >= 0 ? prev.map((x) => x.id === a.id ? a : x) : [a, ...prev]
    })
    setModal(null)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Arquitectos</h1>
          <p className="text-sm text-gray-500 mt-1">{arquitectos.length} arquitectos / estudios</p>
        </div>
        <button onClick={() => setModal('nuevo')} className="btn-primary">+ Nuevo arquitecto</button>
      </div>
      <div className="mb-4">
        <input type="text" placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="input w-64" />
      </div>
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="table-th">Nombre</th>
                <th className="table-th">Estudio</th>
                <th className="table-th">Teléfono</th>
                <th className="table-th">Email</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium text-gray-900">{a.nombre}{a.apellido ? ` ${a.apellido}` : ''}</td>
                  <td className="table-td text-gray-500">{a.estudio ?? '—'}</td>
                  <td className="table-td text-gray-500">{a.telefono ?? '—'}</td>
                  <td className="table-td text-gray-500">{a.email ?? '—'}</td>
                  <td className="table-td">
                    <button onClick={() => setModal(a)} className="text-xs text-blue-600 hover:underline">Editar</button>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-400">No hay arquitectos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {modal && (
        <ArquitectoModal
          arquitecto={modal === 'nuevo' ? null : modal}
          onSaved={onSaved}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
