'use client'

import { useState } from 'react'
import type { Cliente } from '@/lib/supabase/types'
import { crearCliente, actualizarCliente } from '@/lib/actions/clientes'

type Props = { cliente: Cliente | null; onSaved: (c: Cliente) => void; onClose: () => void }

export default function ClienteModal({ cliente, onSaved, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null); setLoading(true)
    const fd = new FormData(e.currentTarget)
    try {
      const r = cliente ? await actualizarCliente(cliente.id, fd) : await crearCliente(fd)
      if (r) onSaved(r)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-5 text-lg font-bold text-gray-900">{cliente ? 'Editar cliente' : 'Nuevo cliente'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nombre *</label>
              <input name="nombre" defaultValue={cliente?.nombre} required className="input" />
            </div>
            <div>
              <label className="label">Apellido</label>
              <input name="apellido" defaultValue={cliente?.apellido ?? ''} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Razón social</label>
              <input name="razon_social" defaultValue={cliente?.razon_social ?? ''} className="input" />
            </div>
            <div>
              <label className="label">CUIT</label>
              <input name="cuit" defaultValue={cliente?.cuit ?? ''} className="input" placeholder="20-12345678-9" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Teléfono</label>
              <input name="telefono" defaultValue={cliente?.telefono ?? ''} className="input" />
            </div>
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" defaultValue={cliente?.email ?? ''} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Dirección</label>
            <input name="direccion" defaultValue={cliente?.direccion ?? ''} className="input" />
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea name="notas" defaultValue={cliente?.notas ?? ''} rows={2} className="input" />
          </div>
          {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
