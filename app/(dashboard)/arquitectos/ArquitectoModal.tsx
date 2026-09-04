'use client'

import { useState } from 'react'
import type { Arquitecto } from '@/lib/supabase/types'
import { crearArquitecto, actualizarArquitecto } from '@/lib/actions/arquitectos'

type Props = { arquitecto: Arquitecto | null; onSaved: (a: Arquitecto) => void; onClose: () => void }

export default function ArquitectoModal({ arquitecto, onSaved, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null); setLoading(true)
    const fd = new FormData(e.currentTarget)
    const r = arquitecto ? await actualizarArquitecto(arquitecto.id, fd) : await crearArquitecto(fd)
    setLoading(false)
    if (!r.ok) { setError(r.error); return }
    onSaved(r.data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-5 text-lg font-bold text-gray-900">{arquitecto ? 'Editar arquitecto' : 'Nuevo arquitecto'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nombre *</label>
              <input name="nombre" defaultValue={arquitecto?.nombre} required className="input" />
            </div>
            <div>
              <label className="label">Apellido</label>
              <input name="apellido" defaultValue={arquitecto?.apellido ?? ''} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Estudio / empresa</label>
            <input name="estudio" defaultValue={arquitecto?.estudio ?? ''} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Teléfono</label>
              <input name="telefono" defaultValue={arquitecto?.telefono ?? ''} className="input" />
            </div>
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" defaultValue={arquitecto?.email ?? ''} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Dirección</label>
            <input name="direccion" defaultValue={arquitecto?.direccion ?? ''} className="input" />
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea name="notas" defaultValue={arquitecto?.notas ?? ''} rows={2} className="input" />
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
