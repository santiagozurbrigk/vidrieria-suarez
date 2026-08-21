'use client'

import { useState } from 'react'
import type { Producto } from '@/lib/supabase/types'
import { crearProducto, actualizarProducto } from '@/lib/actions/stock'

type Props = {
  producto: Producto | null
  onSaved: (p: Producto) => void
  onClose: () => void
}

export default function ProductoModal({ producto, onSaved, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    try {
      const result = producto
        ? await actualizarProducto(producto.id, fd)
        : await crearProducto(fd)
      if (result) onSaved(result)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-5 text-lg font-bold text-gray-900">
          {producto ? 'Editar producto' : 'Nuevo producto'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nombre *</label>
            <input name="nombre" defaultValue={producto?.nombre} required className="input" />
          </div>
          <div>
            <label className="label">Descripción</label>
            <input name="descripcion" defaultValue={producto?.descripcion ?? ''} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Categoría *</label>
              <select name="categoria" defaultValue={producto?.categoria ?? 'VIDRIO'} required className="input">
                <option value="VIDRIO">Vidrio</option>
                <option value="ALUMINIO">Aluminio</option>
                <option value="ACCESORIO">Accesorio</option>
                <option value="INSUMO">Insumo</option>
              </select>
            </div>
            <div>
              <label className="label">Unidad de medida *</label>
              <select name="unidad_medida" defaultValue={producto?.unidad_medida ?? 'UNIDAD'} required className="input">
                <option value="UNIDAD">Unidad</option>
                <option value="M2">m²</option>
                <option value="ML">ml</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Margen de ganancia (%)</label>
              <input name="margen_ganancia" type="number" step="0.01" min="0" defaultValue={producto?.margen_ganancia ?? 30} className="input" />
            </div>
            <div>
              <label className="label">Stock mínimo</label>
              <input name="stock_minimo" type="number" step="0.001" min="0" defaultValue={producto?.stock_minimo ?? 0} className="input" />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
