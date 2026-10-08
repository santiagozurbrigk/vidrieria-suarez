'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { conUsuario } from '@/lib/supabase/server'
import { ejecutar, type Resultado } from '@/lib/resultado'
import { fechaISO, montoPositivo, parsear, textoOpcional, textoRequerido } from '@/lib/validacion'

// ── Ajuste manual ─────────────────────────────────────────────────────────────

const ajusteSchema = z.object({
  tipo:       z.enum(['INGRESO', 'EGRESO', 'AJUSTE']),
  concepto:   textoRequerido('El concepto es obligatorio'),
  monto:      montoPositivo,
  medio_pago: textoOpcional,
  fecha:      fechaISO,
  notas:      textoOpcional,
})

export async function registrarAjusteCaja(payload: unknown): Promise<Resultado> {
  return ejecutar(async () => {
    const data = parsear(ajusteSchema, payload)
    const { supabase, user } = await conUsuario()

    const { error } = await supabase.from('movimientos_caja').insert({
      tipo:       data.tipo,
      concepto:   data.concepto,
      monto:      data.monto,
      medio_pago: data.medio_pago,
      fecha:      data.fecha,
      usuario_id: user.id,
    })
    if (error) throw error

    revalidatePath('/caja')
    revalidatePath('/')
  })
}

// ── Cierre de caja ────────────────────────────────────────────────────────────

const cierreSchema = z.object({
  fecha:         fechaISO,
  saldo_sistema: z.coerce.number(),
  saldo_real:    z.coerce.number(),
  notas:         textoOpcional,
})

export async function registrarCierreCaja(payload: unknown): Promise<Resultado> {
  return ejecutar(async () => {
    const data = parsear(cierreSchema, payload)
    const { supabase, user } = await conUsuario()

    const { error } = await supabase.from('cierres_caja').insert({
      fecha:         data.fecha,
      saldo_sistema: data.saldo_sistema,
      saldo_real:    data.saldo_real,
      diferencia:    data.saldo_real - data.saldo_sistema,
      estado:        'CERRADO',
      notas:         data.notas,
      usuario_id:    user.id,
    })
    if (error) throw error

    revalidatePath('/caja')
  })
}

// ── Caja como entrada única ───────────────────────────────────────────────────
//
// Las tres formas de cargar plata. Cada una llama a una RPC que hace todo en una
// transacción, así nunca queda media operación: una venta sin stock no deja la
// factura colgada, y un pago a proveedor no deja la plata registrada sin imputar.

const CATEGORIAS = ['PROVEEDOR', 'SERVICIO', 'RETIRO', 'VARIOS', 'VEHICULOS', 'COMBUSTIBLE'] as const

const itemVentaSchema = z.object({
  producto_id:     z.string().uuid(),
  cantidad:        z.coerce.number().positive('La cantidad debe ser mayor a cero'),
  precio_unitario: z.coerce.number().min(0),
  subtotal:        z.coerce.number().min(0),
})

const ventaSchema = z.object({
  total:      montoPositivo,
  iva:        z.coerce.number().min(0).default(0),
  medio_pago: textoRequerido('Elegí el medio de pago'),
  fecha:      fechaISO,
  cliente_id: z.string().uuid().nullable().optional(),
  notas:      textoOpcional,
  items:      z.array(itemVentaSchema).min(1, 'Elegí qué se vendió'),
})

/**
 * Ingreso por una venta: crea la factura (que descuenta el stock) y la cobra.
 * Sin cliente, va a la ficha de mostrador "Consumidor Final".
 */
export async function registrarVenta(payload: unknown): Promise<Resultado> {
  return ejecutar(async () => {
    const data = parsear(ventaSchema, payload)
    if (data.iva > data.total) {
      throw new Error('El IVA no puede ser mayor que el total.')
    }
    const { supabase } = await conUsuario()

    const { error } = await supabase.rpc('registrar_venta_caja', {
      p_total:      data.total,
      p_medio_pago: data.medio_pago,
      p_fecha:      data.fecha,
      p_items:      data.items,
      p_cliente_id: data.cliente_id ?? undefined,
      p_iva:        data.iva,
      p_notas:      data.notas ?? undefined,
    })
    if (error) throw error

    revalidarTodo()
  })
}

const ingresoSchema = z.object({
  concepto:   textoRequerido('Detallá de qué es el ingreso'),
  monto:      montoPositivo,
  medio_pago: textoRequerido('Elegí el medio de pago'),
  fecha:      fechaISO,
  notas:      textoOpcional,
})

/** Ingreso que no es una venta: un aporte, un reintegro, lo que sea. */
export async function registrarIngreso(payload: unknown): Promise<Resultado> {
  return ejecutar(async () => {
    const data = parsear(ingresoSchema, payload)
    const { supabase } = await conUsuario()

    const { error } = await supabase.rpc('registrar_ingreso_caja', {
      p_concepto:   data.concepto,
      p_monto:      data.monto,
      p_medio_pago: data.medio_pago,
      p_fecha:      data.fecha,
      p_notas:      data.notas ?? undefined,
    })
    if (error) throw error

    revalidarTodo()
  })
}

const imputacionSchema = z.object({
  factura_compra_id: z.string().uuid(),
  monto_imputado:    z.coerce.number().positive(),
})

const egresoSchema = z
  .object({
    categoria:     z.enum(CATEGORIAS),
    concepto:      textoOpcional,
    monto:         montoPositivo,
    medio_pago:    textoRequerido('Elegí el medio de pago'),
    fecha:         fechaISO,
    proveedor_id:  z.string().uuid().nullable().optional(),
    imputaciones:  z.array(imputacionSchema).default([]),
    notas:         textoOpcional,
  })
  // El concepto es obligatorio salvo en un pago a proveedor, donde el detalle
  // sale del proveedor y de las facturas imputadas.
  .refine((d) => d.categoria === 'PROVEEDOR' || !!d.concepto, {
    message: 'Detallá de qué es el egreso',
    path:    ['concepto'],
  })
  .refine((d) => d.categoria !== 'PROVEEDOR' || !!d.proveedor_id, {
    message: 'Elegí el proveedor al que se le pagó',
    path:    ['proveedor_id'],
  })

/**
 * Egreso. Con categoría Proveedor registra el pago e imputa a las facturas
 * elegidas, aceptando montos parciales: si una factura debe $200.000 y se le
 * cargan $100.000, quedan $100.000 pendientes en ella. Con cualquier otra
 * categoría queda como gasto.
 */
export async function registrarEgreso(payload: unknown): Promise<Resultado> {
  return ejecutar(async () => {
    const data = parsear(egresoSchema, payload)

    const imputado = data.imputaciones.reduce((s, i) => s + i.monto_imputado, 0)
    if (imputado > data.monto + 0.001) {
      throw new Error('Lo cargado a las facturas supera el monto del egreso.')
    }
    const { supabase } = await conUsuario()

    const { error } = await supabase.rpc('registrar_egreso_caja', {
      p_categoria:    data.categoria,
      p_monto:        data.monto,
      p_medio_pago:   data.medio_pago,
      p_fecha:        data.fecha,
      p_concepto:     data.concepto ?? undefined,
      p_proveedor_id: data.proveedor_id ?? undefined,
      p_imputaciones: data.imputaciones,
      p_notas:        data.notas ?? undefined,
    })
    if (error) throw error

    revalidarTodo()
  })
}

const imputacionVentaSchema = z.object({
  factura_venta_id: z.string().uuid(),
  monto_imputado:   z.coerce.number().positive(),
})

const cobroSchema = z.object({
  cliente_id:   z.string().uuid('Elegí el cliente que pagó'),
  monto:        montoPositivo,
  medio_pago:   textoRequerido('Elegí el medio de pago'),
  fecha:        fechaISO,
  imputaciones: z.array(imputacionVentaSchema).default([]),
  notas:        textoOpcional,
})

/**
 * Ingreso por el cobro de una factura que ya existía.
 *
 * El espejo del egreso a proveedor: se reparte el monto entre las facturas del
 * cliente con saldo, aceptando cobros parciales. No es una venta nueva —la
 * mercadería ya salió—, así que no toca el stock.
 */
export async function registrarCobro(payload: unknown): Promise<Resultado> {
  return ejecutar(async () => {
    const data = parsear(cobroSchema, payload)

    const imputado = data.imputaciones.reduce((s, i) => s + i.monto_imputado, 0)
    if (imputado > data.monto + 0.001) {
      throw new Error('Lo cargado a las facturas supera el monto del cobro.')
    }
    const { supabase } = await conUsuario()

    const { error } = await supabase.rpc('registrar_cobro_caja', {
      p_cliente_id:   data.cliente_id,
      p_monto:        data.monto,
      p_medio_pago:   data.medio_pago,
      p_fecha:        data.fecha,
      p_imputaciones: data.imputaciones,
      p_notas:        data.notas ?? undefined,
    })
    if (error) throw error

    revalidarTodo()
  })
}

function revalidarTodo() {
  revalidatePath('/caja')
  revalidatePath('/gastos')
  revalidatePath('/stock')
  revalidatePath('/proveedores')
  revalidatePath('/compras')
  revalidatePath('/pagos')
  revalidatePath('/')
}

/**
 * Elimina un movimiento de caja, sea el que sea, y deshace lo que había
 * provocado: una venta devuelve el stock y borra su factura, un pago a
 * proveedor devuelve el saldo a las facturas que había pagado.
 *
 * Caja es la única vista de la plata, así que tiene que poder sacar una fila mal
 * cargada; Gastos sólo alcanza a los egresos.
 */
export async function eliminarMovimiento(movimientoId: string): Promise<Resultado> {
  return ejecutar(async () => {
    const { supabase } = await conUsuario()

    const { error } = await supabase.rpc('eliminar_movimiento_caja', {
      p_movimiento_id: parsear(z.string().uuid(), movimientoId),
    })
    if (error) throw error

    revalidarTodo()
  })
}
