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
