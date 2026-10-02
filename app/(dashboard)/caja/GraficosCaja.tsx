'use client'

import { useState } from 'react'
import { LABEL_CATEGORIA } from '@/lib/caja'
import { nombreMes } from '@/lib/fechas'

/**
 * Gráficos de caja.
 *
 * Los colores no son verde/rojo: ese par no se distingue con daltonismo rojo-verde
 * (ΔE 5.0, muy por debajo del mínimo). Azul y naranja llegan a ΔE 31 y además la
 * identidad nunca depende sólo del color: hay leyenda y las barras van siempre en
 * el mismo orden dentro de cada grupo.
 */
const COLOR_INGRESO = '#2563eb'
const COLOR_EGRESO  = '#ea580c'

type Periodo = 'dia' | 'semana' | 'mes'

type Punto = { etiqueta: string; ingresos: number; egresos: number; neto: number }

type Props = {
  porDia:       { dia: string; ingresos: number; egresos: number; neto: number }[]
  porSemana:    { semana: string; ingresos: number; egresos: number; neto: number }[]
  porMes:       { mes: string; ingresos: number; egresos: number; neto: number }[]
  porCategoria: { categoria: string; total: number }[]
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

function formatCompacto(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000)     return `$${Math.round(n / 1_000)}k`
  return `$${Math.round(n)}`
}

function diaCorto(iso: string) {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

function mesCorto(iso: string) {
  const [a, m] = iso.split('-').map(Number)
  return `${nombreMes(a, m).slice(0, 3)} ${String(a).slice(2)}`
}

export default function GraficosCaja({ porDia, porSemana, porMes, porCategoria }: Props) {
  const [periodo, setPeriodo] = useState<Periodo>('dia')

  // Los últimos tramos, en orden cronológico y con un techo para que el gráfico
  // no se vuelva ilegible cuando hay mucha historia.
  const series: Record<Periodo, Punto[]> = {
    dia: porDia
      .slice()
      .sort((a, b) => a.dia.localeCompare(b.dia))
      .slice(-30)
      .map((p) => ({ etiqueta: diaCorto(p.dia), ...p })),
    semana: porSemana
      .slice()
      .sort((a, b) => a.semana.localeCompare(b.semana))
      .slice(-16)
      .map((p) => ({ etiqueta: `sem. ${diaCorto(p.semana)}`, ...p })),
    mes: porMes
      .slice()
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-12)
      .map((p) => ({ etiqueta: mesCorto(p.mes), ...p })),
  }

  const puntos = series[periodo]
  const maximo = Math.max(1, ...puntos.flatMap((p) => [p.ingresos, p.egresos]))

  const ETIQUETAS: Record<Periodo, string> = { dia: 'Por día', semana: 'Por semana', mes: 'Por mes' }

  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-3">
      {/* ── Ingresos vs egresos en el tiempo ── */}
      <div className="card p-5 lg:col-span-2">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Entradas y salidas</h2>
            <div className="mt-1.5 flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_INGRESO }} />
                Entra
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_EGRESO }} />
                Sale
              </span>
            </div>
          </div>
          <div className="flex overflow-hidden rounded-lg border border-gray-200 text-xs">
            {(['dia', 'semana', 'mes'] as Periodo[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  periodo === p ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {ETIQUETAS[p]}
              </button>
            ))}
          </div>
        </div>

        {puntos.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">
            Todavía no hay movimientos para graficar.
          </p>
        ) : (
          <>
            <div className="flex h-48 items-end gap-1 border-b border-gray-100">
              {puntos.map((p, i) => (
                <div key={i} className="group relative flex h-full flex-1 items-end justify-center gap-[2px]">
                  {/* Tooltip */}
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-lg group-hover:block">
                    <div className="font-medium">{p.etiqueta}</div>
                    <div>Entra {formatCurrency(p.ingresos)}</div>
                    <div>Sale {formatCurrency(p.egresos)}</div>
                    <div className="mt-0.5 border-t border-white/20 pt-0.5">
                      Neto {formatCurrency(p.neto)}
                    </div>
                  </div>
                  <div
                    className="w-1/2 rounded-t transition-opacity group-hover:opacity-80"
                    style={{
                      height: `${Math.max(p.ingresos > 0 ? 2 : 0, (p.ingresos / maximo) * 100)}%`,
                      background: COLOR_INGRESO,
                    }}
                  />
                  <div
                    className="w-1/2 rounded-t transition-opacity group-hover:opacity-80"
                    style={{
                      height: `${Math.max(p.egresos > 0 ? 2 : 0, (p.egresos / maximo) * 100)}%`,
                      background: COLOR_EGRESO,
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex gap-1 text-[10px] text-gray-400">
              {puntos.map((p, i) => (
                <span key={i} className="flex-1 truncate text-center">
                  {/* Con muchas barras se etiquetan sólo algunas para que no se superpongan */}
                  {puntos.length <= 12 || i % Math.ceil(puntos.length / 8) === 0 ? p.etiqueta : ''}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Máximo del período: {formatCompacto(maximo)}. Pasá el mouse por una barra para ver el detalle.
            </p>
          </>
        )}
      </div>

      {/* ── Egresos por categoría ── */}
      <div className="card p-5">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">Salidas por categoría</h2>
        <p className="mb-4 text-xs text-gray-400">Este mes</p>

        {porCategoria.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">Sin salidas este mes.</p>
        ) : (
          <div className="space-y-2.5">
            {porCategoria.map((c) => {
              const tope = Math.max(...porCategoria.map((x) => x.total))
              return (
                <div key={c.categoria}>
                  <div className="mb-1 flex items-baseline justify-between text-xs">
                    <span className="font-medium text-gray-700">
                      {LABEL_CATEGORIA[c.categoria] ?? c.categoria}
                    </span>
                    <span className="text-gray-500">{formatCurrency(c.total)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(2, (c.total / tope) * 100)}%`, background: COLOR_EGRESO }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
