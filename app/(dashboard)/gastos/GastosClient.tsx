'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import GastoModal from './GastoModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { eliminarEgreso } from '@/lib/actions/gastos'
import { exportarExcel } from '@/lib/exportar'
import { nombreMes } from '@/lib/fechas'
import { avisoListadoParcial } from '@/lib/paginacion'
import { CATEGORIAS_EGRESO, LABEL_CATEGORIA } from '@/lib/caja'

type Egreso = {
  movimiento_id:    string
  fecha:            string
  concepto:         string
  monto:            number
  medio_pago:       string | null
  categoria_egreso: string | null
  proveedor:        string | null
  proveedor_id:     string | null
  gasto_id:         string | null
  /** Con pago_id, el egreso es un pago a proveedor y arrastra imputaciones. */
  pago_id:          string | null
  notas:            string | null
}

type ProveedorSlim = { id: string; razon_social: string }
type FacturaSlim = {
  id: string
  numero: string
  fecha: string
  total: number
  saldo_pendiente: number
  proveedor_id: string
}
type Imputacion = { pago_id: string; factura_compra_id: string; monto_imputado: number }

type Props = {
  egresos:        Egreso[]
  proveedores:    ProveedorSlim[]
  facturasCompra: FacturaSlim[]
  imputaciones:   Imputacion[]
  totalFilas:   number | null
  /** Período mostrado, 'YYYY-MM'. Lo resuelve el servidor desde ?mes=. */
  mes:          string
  meses:        string[]
  totalMes:     number
  porCategoria: { categoria: string; total: number; cantidad: number }[]
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

function formatFecha(d: string) {
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function mesLabel(mes: string) {
  const [anio, m] = mes.split('-').map(Number)
  return nombreMes(anio, m)
}

export default function GastosClient({
  egresos, proveedores, facturasCompra, imputaciones,
  totalFilas, mes, meses, totalMes, porCategoria,
}: Props) {
  const router = useRouter()
  const [categoria, setCategoria] = useState<string>('TODAS')
  const [busqueda, setBusqueda]   = useState('')
  const [editar, setEditar]       = useState<Egreso | null>(null)
  const [borrar, setBorrar]       = useState<Egreso | null>(null)
  const [borrando, setBorrando]   = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const aviso = avisoListadoParcial(egresos.length, totalFilas)

  const filtrados = useMemo(() => egresos.filter((e) => {
    const matchCat = categoria === 'TODAS' || e.categoria_egreso === categoria
    const q = busqueda.toLowerCase()
    const matchTexto = busqueda === '' ||
      e.concepto.toLowerCase().includes(q) ||
      (e.proveedor ?? '').toLowerCase().includes(q) ||
      (e.medio_pago ?? '').toLowerCase().includes(q)
    return matchCat && matchTexto
  }), [egresos, categoria, busqueda])

  const totalFiltrado = filtrados.reduce((s, e) => s + e.monto, 0)

  async function confirmarBorrado() {
    if (!borrar) return
    setBorrando(true)
    const r = await eliminarEgreso(borrar.movimiento_id)
    setBorrando(false)
    setBorrar(null)
    if (!r.ok) { setError(r.error); return }
    setError(null)
    router.refresh()
  }

  return (
    <>
      <div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gastos</h1>
            <p className="mt-1 text-sm text-gray-500">
              Todo lo que salió de caja, con su categoría. Los pagos a proveedores
              también aparecen acá.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => exportarExcel(
                filtrados.map((e) => ({
                  Fecha:     formatFecha(e.fecha),
                  Categoría: e.categoria_egreso ? LABEL_CATEGORIA[e.categoria_egreso] ?? e.categoria_egreso : 'Sin categoría',
                  Detalle:   e.concepto,
                  Proveedor: e.proveedor ?? '',
                  Medio:     e.medio_pago ?? '',
                  Monto:     e.monto,
                })),
                'Gastos',
                `gastos-${mes}`,
              )}
              className="btn-secondary"
              disabled={filtrados.length === 0}
            >
              Exportar
            </button>
            <Link href="/caja" className="btn-primary">
              Cargar en Caja
            </Link>
          </div>
        </div>

        <p className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Los egresos se cargan desde <strong>Caja → + Nuevo movimiento</strong>, así la
          plata queda registrada una sola vez.
        </p>

        {aviso && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {aviso}
          </p>
        )}
        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        {/* Resumen del mes */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total del mes</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(totalMes)}</p>
            <p className="mt-0.5 text-xs text-gray-400">{mesLabel(mes)}</p>
          </div>
          <div className="card p-4 sm:col-span-2">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Por categoría</p>
            {porCategoria.length === 0 ? (
              <p className="text-sm text-gray-400">Sin egresos este mes.</p>
            ) : (
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                {porCategoria.map((c) => (
                  <span key={c.categoria} className="text-gray-600">
                    {LABEL_CATEGORIA[c.categoria] ?? 'Sin categoría'}{' '}
                    <strong className="text-gray-900">{formatCurrency(c.total)}</strong>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <select
            value={mes}
            onChange={(e) => router.push(`/gastos?mes=${e.target.value}`)}
            className="input w-44 text-sm"
          >
            {meses.map((m) => <option key={m} value={m}>{mesLabel(m)}</option>)}
          </select>

          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="input w-44 text-sm"
          >
            <option value="TODAS">Todas las categorías</option>
            {CATEGORIAS_EGRESO.map((c) => (
              <option key={c.valor} value={c.valor}>{c.label}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Buscar por detalle o proveedor..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="input w-64 text-sm"
          />

          {(categoria !== 'TODAS' || busqueda !== '') && (
            <span className="text-sm text-gray-500">
              {filtrados.length} de {egresos.length} · {formatCurrency(totalFiltrado)}
            </span>
          )}
        </div>

        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="table-th">Fecha</th>
                  <th className="table-th">Categoría</th>
                  <th className="table-th">Detalle</th>
                  <th className="table-th">Medio</th>
                  <th className="table-th text-right">Monto</th>
                  <th className="table-th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrados.map((e) => (
                  <tr key={e.movimiento_id} className="transition-colors hover:bg-gray-50">
                    <td className="table-td text-xs text-gray-500">{formatFecha(e.fecha)}</td>
                    <td className="table-td">
                      <span className="badge bg-gray-100 text-gray-700">
                        {e.categoria_egreso
                          ? LABEL_CATEGORIA[e.categoria_egreso] ?? e.categoria_egreso
                          : 'Sin categoría'}
                      </span>
                    </td>
                    <td className="table-td">
                      <span className="font-medium text-gray-900">{e.concepto}</span>
                      {e.notas && <span className="block text-xs text-gray-400">{e.notas}</span>}
                    </td>
                    <td className="table-td text-sm text-gray-500">{e.medio_pago ?? '—'}</td>
                    <td className="table-td text-right font-semibold text-gray-900">
                      {formatCurrency(e.monto)}
                    </td>
                    <td className="table-td">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => setEditar(e)}
                          className="text-xs text-gray-500 hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setBorrar(e)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                      {egresos.length === 0
                        ? `No hay egresos en ${mesLabel(mes)}.`
                        : 'Ningún egreso coincide con el filtro.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editar && (
        <GastoModal
          egreso={{
            movimiento_id:    editar.movimiento_id,
            concepto:         editar.concepto,
            monto:            editar.monto,
            fecha:            editar.fecha,
            medio_pago:       editar.medio_pago,
            categoria_egreso: editar.categoria_egreso,
            proveedor_id:     editar.proveedor_id,
            notas:            editar.notas,
            es_pago:          !!editar.pago_id,
          }}
          proveedores={proveedores}
          facturasCompra={facturasCompra.map((f) => ({
            ...f,
            // Lo que este pago le imputa hoy a esa factura.
            imputado_aqui: editar.pago_id
              ? imputaciones
                  .filter((i) => i.pago_id === editar.pago_id && i.factura_compra_id === f.id)
                  .reduce((s, i) => s + i.monto_imputado, 0)
              : 0,
          }))}
          onSaved={() => { setEditar(null); router.refresh() }}
          onClose={() => setEditar(null)}
        />
      )}

      {borrar && (
        <ConfirmDialog
          title="Eliminar egreso"
          message={
            borrar.pago_id
              ? `Se va a eliminar el pago de ${formatCurrency(borrar.monto)}${borrar.proveedor ? ` a ${borrar.proveedor}` : ''}. El saldo de las facturas que pagaba vuelve a quedar pendiente.`
              : `Se va a eliminar "${borrar.concepto}" por ${formatCurrency(borrar.monto)}. También se borra su movimiento de caja.`
          }
          confirmLabel="Eliminar"
          variant="danger"
          loading={borrando}
          onConfirm={confirmarBorrado}
          onCancel={() => setBorrar(null)}
        />
      )}
    </>
  )
}
