'use client'

import { useState } from 'react'
import type { Obra } from '@/lib/supabase/types'
import { actualizarObra, crearObra } from '@/lib/actions/obras'

type ArquitectoSlim = { id: string; nombre: string; apellido: string | null; estudio: string | null }
type ClienteSlim    = { id: string; nombre: string; apellido: string | null; razon_social: string | null }

type Props = {
  obra:        Obra | null
  arquitectos: ArquitectoSlim[]
  clientes:    ClienteSlim[]
  onSaved:     (o: Obra) => void
  onClose:     () => void
}

export function arquitectoLabel(a: { nombre: string; apellido: string | null; estudio: string | null }) {
  const nombre = [a.nombre, a.apellido].filter(Boolean).join(' ')
  return a.estudio ? `${nombre} (${a.estudio})` : nombre
}

export function clienteLabel(c: { nombre: string; apellido: string | null; razon_social: string | null }) {
  if (c.razon_social) return c.razon_social
  return [c.nombre, c.apellido].filter(Boolean).join(' ')
}

export default function ObraModal({ obra, arquitectos, clientes, onSaved, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const r = obra ? await actualizarObra(obra.id, fd) : await crearObra(fd)
    setLoading(false)
    if (!r.ok) { setError(r.error); return }
    onSaved(r.data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-5 text-lg font-bold text-gray-900">
          {obra ? 'Editar obra' : 'Nueva obra'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nombre de la obra *</label>
            <input
              name="nombre"
              defaultValue={obra?.nombre}
              required
              className="input"
              placeholder="Ej: Torre Belgrano"
            />
          </div>

          <div>
            <label className="label">Arquitecto *</label>
            <select name="arquitecto_id" defaultValue={obra?.arquitecto_id ?? ''} required className="input">
              <option value="">Seleccioná un arquitecto…</option>
              {arquitectos.map((a) => (
                <option key={a.id} value={a.id}>{arquitectoLabel(a)}</option>
              ))}
            </select>
            {arquitectos.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                No hay arquitectos cargados. Cargá uno primero en la sección Arquitectos.
              </p>
            )}
          </div>

          <div>
            <label className="label">
              Cliente <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <select name="cliente_id" defaultValue={obra?.cliente_id ?? ''} className="input">
              <option value="">Sin cliente asignado</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{clienteLabel(c)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Dirección</label>
            <input name="direccion" defaultValue={obra?.direccion ?? ''} className="input" />
          </div>

          <div>
            <label className="label">Notas</label>
            <textarea name="notas" defaultValue={obra?.notas ?? ''} rows={2} className="input" />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
