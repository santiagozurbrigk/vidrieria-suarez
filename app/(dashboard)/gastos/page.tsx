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

  // El período se filtra en el servidor. Antes se traían las últimas 200 filas
  // y se filtraba por mes en el navegador, así que cualquier mes anterior a esa
  // ventana aparecía vacío.
  const { mes: mesParam } = await searchParams
  const mes = /^\d{4}-\d{2}$/.test(mesParam ?? '') ? mesParam! : mesActual()
  const { desde, hasta } = rangoMes(mes)

  const [
    { data: gastos, count },
    { data: categorias },
    { data: totalesMes },
    { data: porCategoria },
  ] = await Promise.all([
    supabase
      .from('gastos')
      .select('*, categorias_gasto(nombre)', { count: 'exact' })
      .gte('fecha', desde)
      .lt('fecha', hasta)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(LIMITE_LISTADO),
    supabase.from('categorias_gasto').select('*').eq('activo', true).order('nombre'),
    // Un renglón por mes con gastos: alimenta el selector de período y el total.
    supabase.from('v_gastos_por_mes').select('*').order('mes', { ascending: false }),
    supabase
      .from('v_gastos_por_categoria_mes')
      .select('*')
      .eq('mes', mes)
      .order('total', { ascending: false }),
  ])

  const totalMes = totalesMes?.find((m) => m.mes === mes)?.total ?? 0

  // El mes actual siempre aparece en el selector, tenga gastos o no.
  const mesesConGastos = (totalesMes ?? [])
    .map((m) => m.mes)
    .filter((m): m is string => m !== null)
  const meses = Array.from(new Set([...mesesConGastos, mesActual(), mes]))
    .sort()
    .reverse()

  // Las columnas calculadas de una vista llegan como nullable aunque nunca lo sean.
  const categorias_del_mes = (porCategoria ?? []).map((c) => ({
    ...c,
    categoria: c.categoria ?? 'Sin categoría',
    total:     c.total ?? 0,
    cantidad:  c.cantidad ?? 0,
  }))

  return (
    <GastosClient
      gastos={gastos ?? []}
      totalFilas={count}
      mes={mes}
      meses={meses}
      totalMes={totalMes}
      porCategoria={categorias_del_mes}
      categorias={categorias ?? []}
    />
  )
}
