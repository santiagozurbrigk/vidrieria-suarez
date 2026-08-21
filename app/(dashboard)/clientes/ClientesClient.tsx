'use client'

import { useState } from 'react'
import type { Cliente } from '@/lib/supabase/types'
import ClienteModal from './ClienteModal'

type Props = { clientes: Cliente[] }

export default function ClientesClient({ clientes: initial }: Props) {
  const [clientes, setClientes] = useState(initial)
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState<Cliente | null | 'nuevo'>(null)

  const filtrados = clientes.filter((c) =>
    `${c.nombre} ${c.apellido ?? ''} ${c.razon_social ?? ''}`.toLowerCase().includes(busqueda.toLowerCase())
  )

  function onSaved(c: Cliente) {
    setClientes((prev) => {
      const idx = prev.findIndex((x) => x.id === c.id)
      return idx >= 0 ? prev.map((x) => x.id === c.id ? c : x) : [c, ...prev]
    })
    setModal(null)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">{clientes.length} clientes</p>
        </div>
        <button onClick={() => setModal('nuevo')} className="btn-primary">+ Nuevo cliente</button>
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
                <th className="table-th">Razón social</th>
                <th className="table-th">CUIT</th>
                <th className="table-th">Teléfono</th>
                <th className="table-th">Email</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium text-gray-900">{c.nombre}{c.apellido ? ` ${c.apellido}` : ''}</td>
                  <td className="table-td text-gray-500">{c.razon_social ?? '—'}</td>
                  <td className="table-td text-gray-500">{c.cuit ?? '—'}</td>
                  <td className="table-td text-gray-500">{c.telefono ?? '—'}</td>
                  <td className="table-td text-gray-500">{c.email ?? '—'}</td>
                  <td className="table-td">
                    <button onClick={() => setModal(c)} className="text-xs text-blue-600 hover:underline">Editar</button>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-400">No hay clientes.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {modal && (
        <ClienteModal
          cliente={modal === 'nuevo' ? null : modal}
          onSaved={onSaved}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
