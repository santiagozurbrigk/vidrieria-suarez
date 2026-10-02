import { createServerClient } from '@/lib/supabase/server'
import { mesActual, rangoMes } from '@/lib/fechas'
import { LIMITE_LISTADO } from '@/lib/paginacion'
import GastosClient from './GastosClient'

export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const supabase = await createServerClient()

  // El período se filtra en el servidor. Antes se traían las últimas 200 filas y
  // se filtraba por mes en el navegador, así que cualquier mes anterior a esa
  // ventana aparecía vacío.
  const { mes: mesParam } = await searchParams
  const mes = /^\d{4}-\d{2}$/.test(mesParam ?? '') ? mesParam! : mesActual()
  const { desde, hasta } = rangoMes(mes)

  const [
    { data: egresos, count },
    { data: porCategoria },
    { data: meses },
  ] = await Promise.all([
    // v_egresos trae TODO lo que salió de caja: los gastos propios y también los
    // pagos a proveedor, sin duplicar la plata.
    supabase
      .from('v_egresos')
      .select('*', { count: 'exact' })
      .gte('fecha', desde)
      .lt('fecha', hasta)
      .order('fecha', { ascending: false })
      .limit(LIMITE_LISTADO),
    supabase
      .from('v_egresos_por_categoria_mes')
      .select('*')
      .eq('mes', `${mes}-01`)
      .order('total', { ascending: false }),
    // Los meses que tuvieron movimiento, para el selector de período.
    supabase.from('v_caja_por_mes').select('mes').order('mes', { ascending: false }).limit(36),
  ])

  const mesesDisponibles = Array.from(
    new Set([
      ...(meses ?? []).map((m) => m.mes?.slice(0, 7)).filter((m): m is string => !!m),
      mesActual(),
      mes,
    ]),
  )
    .sort()
    .reverse()

  const categorias = (porCategoria ?? []).map((c) => ({
    categoria: c.categoria ?? 'SIN_CATEGORIA',
    total:     c.total ?? 0,
    cantidad:  c.cantidad ?? 0,
  }))

  return (
    <GastosClient
      egresos={(egresos ?? []).map((e) => ({
        movimiento_id:    e.movimiento_id ?? '',
        fecha:            e.fecha ?? '',
        concepto:         e.concepto ?? '',
        monto:            e.monto ?? 0,
        medio_pago:       e.medio_pago,
        categoria_egreso: e.categoria_egreso,
        proveedor:        e.proveedor,
        gasto_id:         e.gasto_id,
        notas:            e.notas,
        editable:         e.editable ?? false,
      }))}
      totalFilas={count}
      mes={mes}
      meses={mesesDisponibles}
      totalMes={categorias.reduce((s, c) => s + c.total, 0)}
      porCategoria={categorias}
    />
  )
}
