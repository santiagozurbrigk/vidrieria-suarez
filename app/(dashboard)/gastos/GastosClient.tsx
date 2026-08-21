'use client'

import { useState } from 'react'
import type { Gasto, CategoriaGasto } from '@/lib/supabase/types'
import { registrarGasto } from '@/lib/actions/gastos'

type GastoConCategoria = Gasto & { categorias_gasto: { nombre: string } | null }

type Props = {
  gastos: GastoConCategoria[]
  categorias: CategoriaGasto[]
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

export default function GastosClient({ gastos: initial, categorias }: Props) {
  const [gastos, setGastos] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalMes = gastos
    .filter((g) => {
      const fecha = new Date(g.fecha)
      const hoy = new Date()
      return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear()
    })
    .reduce((s, g) => s + g.monto, 0)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    try {
      const nuevo = await registrarGasto(fd)
      if (nuevo) {
        const cat = categorias.find((c) => c.id === nuevo.categoria_id)
        setGastos((prev) => [{ ...nuevo, categorias_gasto: cat ? { nombre: cat.nombre } : null }, ...prev])
        setShowForm(false)
        ;(e.target as HTMLFormElement).reset()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar gasto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gastos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Total mes actual: <strong className="text-red-600">{formatCurrency(totalMes)}</strong>
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancelar' : '+ Nuevo gasto'}
        </button>
      </div>

      {/* Formulario inline */}
      {showForm && (
        <div className="card mb-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Registrar gasto</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <label className="label">Categoría *</label>
              <select name="categoria_id" required className="input">
                <option value="">— Seleccionar —</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="col-span-2 md:col-span-2">
              <label className="label">Concepto *</label>
              <input name="concepto" required className="input" placeholder="Descripción del gasto" />
            </div>
            <div>
              <label className="label">Monto *</label>
              <input name="monto" type="number" step="0.01" min="0.01" required className="input" />
            </div>
            <div>
              <label className="label">Fecha *</label>
              <input name="fecha" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className="input" />
            </div>
            <div>
              <label className="label">Medio de pago</label>
              <select name="medio_pago" className="input">
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="TARJETA">Tarjeta</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Notas</label>
              <input name="notas" className="input" />
            </div>
            <div className="col-span-2 md:col-span-4 flex justify-end gap-3">
              {error && <p className="flex-1 text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Registrando...' : 'Registrar gasto'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="table-th">Fecha</th>
                <th className="table-th">Categoría</th>
                <th className="table-th">Concepto</th>
                <th className="table-th">Medio de pago</th>
                <th className="table-th text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {gastos.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="table-td text-gray-500 text-xs">{g.fecha}</td>
                  <td className="table-td">
                    <span className="badge bg-purple-100 text-purple-700">
                      {g.categorias_gasto?.nombre ?? '—'}
                    </span>
                  </td>
                  <td className="table-td font-medium text-gray-900">{g.concepto}</td>
                  <td className="table-td text-gray-500">{g.medio_pago ?? '—'}</td>
                  <td className="table-td text-right font-semibold text-red-600">{formatCurrency(g.monto)}</td>
                </tr>
              ))}
              {gastos.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-gray-400">No hay gastos registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
