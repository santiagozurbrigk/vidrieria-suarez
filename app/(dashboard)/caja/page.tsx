import { createServerClient } from '@/lib/supabase/server'
import { LIMITE_LISTADO } from '@/lib/paginacion'
import CajaClient from './CajaClient'

export default async function CajaPage() {
  const supabase = await createServerClient()

  const [
    { data: saldoRaw },
    { data: movimientos, count },
    { data: cierres },
  ] = await Promise.all([
    supabase.from('v_saldo_caja').select('*').single(),
    supabase
      .from('movimientos_caja')
      .select('*', { count: 'exact' })
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(LIMITE_LISTADO),
    supabase
      .from('cierres_caja')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(LIMITE_LISTADO),
  ])

  const saldo = saldoRaw ?? { saldo_actual: 0, total_ingresos: 0, total_egresos: 0 }

  return (
    <CajaClient
      saldo={saldo as { saldo_actual: number; total_ingresos: number; total_egresos: number }}
      movimientos={movimientos ?? []}
      totalFilas={count}
      cierres={cierres ?? []}
    />
  )
}
