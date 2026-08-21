'use client'

import { useState } from 'react'
import type { Proveedor, Producto } from '@/lib/supabase/types'
import ProveedorModal from './ProveedorModal'
import FacturaCompraModal from './FacturaCompraModal'

type Props = {
  proveedores: Proveedor[]
  productos: Pick<Producto, 'id' | 'nombre' | 'unidad_medida' | 'costo_actual'>[]
}

export default function ProveedoresClient({ proveedores: initial, productos }: Props) {
  const [proveedores, setProveedores] = useState(initial)
  const [busqueda, setBusqueda] = useState('')
  const [modalProveedor, setModalProveedor] = useState<Proveedor | null | 'nuevo'>(null)
  const [modalFactura, setModalFactura] = useState<Proveedor | null>(null)

  const filtrados = proveedores.filter((p) =>
    p.razon_social.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.cuit ?? '').includes(busqueda)
  )

  function onProveedorSaved(p: Proveedor) {
    setProveedores((prev) => {
      const idx = prev.findIndex((x) => x.id === p.id)
      return idx >= 0 ? prev.map((x) => (x.id === p.id ? p : x)) : [p, ...prev]
    })
    setModalProveedor(null)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
          <p className="text-sm text-gray-500 mt-1">{proveedores.length} proveedores</p>
        </div>
        <button onClick={() => setModalProveedor('nuevo')} className="btn-primary">
          + Nuevo proveedor
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por razón social o CUIT..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input w-72"
        />
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="table-th">Razón social</th>
                <th className="table-th">CUIT</th>
                <th className="table-th">Condición IVA</th>
                <th className="table-th">Contacto</th>
                <th className="table-th">Teléfono</th>
                <th className="table-th">Alias CBU</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-td font-medium text-gray-900">{p.razon_social}</td>
                  <td className="table-td text-gray-500">{p.cuit ?? '—'}</td>
                  <td className="table-td">
                    {p.condicion_iva ? (
                      <span className="badge bg-gray-100 text-gray-700 text-xs">
                        {p.condicion_iva.replace('_', ' ')}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="table-td text-gray-500">{p.contacto ?? '—'}</td>
                  <td className="table-td text-gray-500">{p.telefono ?? '—'}</td>
                  <td className="table-td text-gray-500">{p.alias_cbu ?? '—'}</td>
                  <td className="table-td">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setModalFactura(p)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        + Factura
                      </button>
                      <button
                        onClick={() => setModalProveedor(p)}
                        className="text-xs text-gray-500 hover:underline"
                      >
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-gray-400">
                    No se encontraron proveedores.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalProveedor && (
        <ProveedorModal
          proveedor={modalProveedor === 'nuevo' ? null : modalProveedor}
          onSaved={onProveedorSaved}
          onClose={() => setModalProveedor(null)}
        />
      )}
      {modalFactura && (
        <FacturaCompraModal
          proveedor={modalFactura}
          productos={productos}
          onSaved={() => setModalFactura(null)}
          onClose={() => setModalFactura(null)}
        />
      )}
    </div>
  )
}
