import { createServerClient } from '@/lib/supabase/server'
import { LIMITE_LISTADO } from '@/lib/paginacion'
import { anioMesActual } from '@/lib/fechas'
import CajaClient from './CajaClient'

export default async function CajaPage() {
  const supabase = await createServerClient()
  const { anio, mes } = anioMesActual()
  const mesActual = `${anio}-${String(mes).padStart(2, '0')}-01`

  const [
    { data: saldoRaw },
    { data: movimientos, count },
    { data: cierres },
    { data: porDia },
    { data: porSemana },
    { data: porMes },
    { data: porCategoria },
    { data: productos },
    { data: clientes },
    { data: proveedores },
    { data: facturasCompra },
    { data: facturasVenta },
  ] = await Promise.all([
    supabase.from('v_saldo_caja').select('*').single(),
    supabase
      .from('movimientos_caja')
      .select('*', { count: 'exact' })
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(LIMITE_LISTADO),
    supabase.from('cierres_caja').select('*').order('fecha', { ascending: false }).limit(LIMITE_LISTADO),
    supabase.from('v_caja_por_dia').select('*').order('dia', { ascending: false }).limit(60),
    supabase.from('v_caja_por_semana').select('*').order('semana', { ascending: false }).limit(26),
    supabase.from('v_caja_por_mes').select('*').order('mes', { ascending: false }).limit(24),
    supabase.from('v_egresos_por_categoria_mes').select('*').eq('mes', mesActual).order('total', { ascending: false }),
    // Lo que necesita el modal para cargar un movimiento.
    supabase
      .from('productos')
      .select('id, nombre, unidad_medida, precio_venta, stock_actual')
      .eq('activo', true)
      .order('nombre')
      .limit(LIMITE_LISTADO),
    supabase
      .from('clientes')
      .select('id, nombre, apellido, razon_social')
      .eq('activo', true)
      .order('nombre')
      .limit(LIMITE_LISTADO),
    supabase.from('proveedores').select('id, razon_social').eq('activo', true).order('razon_social').limit(LIMITE_LISTADO),
    supabase
      .from('facturas_compra')
      .select('id, numero, fecha, total, saldo_pendiente, proveedor_id')
      .gt('saldo_pendiente', 0)
      .order('fecha')
      .limit(LIMITE_LISTADO),
    supabase
      .from('facturas_venta')
      .select('id, numero, fecha, total, saldo_pendiente, cliente_id')
      .gt('saldo_pendiente', 0)
      .order('fecha')
      .limit(LIMITE_LISTADO),
  ])

  // Las columnas calculadas de una vista siempre salen nullable: Postgres no puede
  // probar que un sum() no sea null, así que se normalizan acá.
  const n = (v: number | null) => v ?? 0

  return (
    <CajaClient
      saldo={{
        saldo_actual:   n(saldoRaw?.saldo_actual ?? null),
        total_ingresos: n(saldoRaw?.total_ingresos ?? null),
        total_egresos:  n(saldoRaw?.total_egresos ?? null),
      }}
      movimientos={movimientos ?? []}
      totalFilas={count}
      cierres={cierres ?? []}
      porDia={(porDia ?? []).map((d) => ({
        dia: d.dia ?? '', ingresos: n(d.ingresos), egresos: n(d.egresos), neto: n(d.neto),
      }))}
      porSemana={(porSemana ?? []).map((d) => ({
        semana: d.semana ?? '', ingresos: n(d.ingresos), egresos: n(d.egresos), neto: n(d.neto),
      }))}
      porMes={(porMes ?? []).map((d) => ({
        mes: d.mes ?? '', ingresos: n(d.ingresos), egresos: n(d.egresos), neto: n(d.neto),
      }))}
      porCategoria={(porCategoria ?? []).map((c) => ({
        categoria: c.categoria ?? 'SIN_CATEGORIA', total: n(c.total),
      }))}
      productos={productos ?? []}
      clientes={clientes ?? []}
      proveedores={proveedores ?? []}
      facturasCompra={facturasCompra ?? []}
      facturasVenta={facturasVenta ?? []}
    />
  )
}
