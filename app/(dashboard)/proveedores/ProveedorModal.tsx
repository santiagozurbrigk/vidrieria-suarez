'use client'

import { useState } from 'react'
import type { Proveedor } from '@/lib/supabase/types'
import { crearProveedor, actualizarProveedor } from '@/lib/actions/proveedores'

type Props = {
  proveedor: Proveedor | null
  onSaved: (p: Proveedor) => void
  onClose: () => void
}

export default function ProveedorModal({ proveedor, onSaved, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    try {
      const result = proveedor
        ? await actualizarProveedor(proveedor.id, fd)
        : await crearProveedor(fd)
      if (result) onSaved(result)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-5 text-lg font-bold text-gray-900">
          {proveedor ? 'Editar proveedor' : 'Nuevo proveedor'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Razón social *</label>
            <input name="razon_social" defaultValue={proveedor?.razon_social} required className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">CUIT</label>
              <input name="cuit" defaultValue={proveedor?.cuit ?? ''} className="input" placeholder="30-12345678-9" />
            </div>
            <div>
              <label className="label">Condición IVA</label>
              <select name="condicion_iva" defaultValue={proveedor?.condicion_iva ?? ''} className="input">
                <option value="">— Sin especificar —</option>
                <option value="RESPONSABLE_INSCRIPTO">Responsable Inscripto</option>
                <option value="MONOTRIBUTISTA">Monotributista</option>
                <option value="EXENTO">Exento</option>
                <option value="CONSUMIDOR_FINAL">Consumidor Final</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Contacto</label>
              <input name="contacto" defaultValue={proveedor?.contacto ?? ''} className="input" />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input name="telefono" defaultValue={proveedor?.telefono ?? ''} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" defaultValue={proveedor?.email ?? ''} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Alias CBU</label>
              <input name="alias_cbu" defaultValue={proveedor?.alias_cbu ?? ''} className="input" />
            </div>
            <div>
              <label className="label">Dirección</label>
              <input name="direccion" defaultValue={proveedor?.direccion ?? ''} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea name="notas" defaultValue={proveedor?.notas ?? ''} rows={2} className="input" />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>
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
