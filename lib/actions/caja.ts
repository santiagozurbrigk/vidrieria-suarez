'use server'

import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'

// ── Ajuste manual ──────────────────────────────────────────────────────────────
const AjusteSchema = z.object({
  tipo:      z.enum(['INGRESO', 'EGRESO', 'AJUSTE']),
  concepto:  z.string().min(1),
  monto:     z.number().positive(),
  medio_pago: z.string().nullable().optional(),
  fecha:     z.string(),
  notas:     z.string().nullable().optional(),
})

export async function registrarAjusteCaja(payload: unknown) {
  const parsed = AjusteSchema.safeParse(payload)
  if (!parsed.success) throw new Error(parsed.error.errors[0].message)

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase.from('movimientos_caja').insert({
    tipo:      parsed.data.tipo,
    concepto:  parsed.data.concepto,
    monto:     parsed.data.monto,
    medio_pago: parsed.data.medio_pago ?? null,
    fecha:     parsed.data.fecha,
    usuario_id: user.id,
  })
  if (error) throw new Error(error.message)
}

// ── Cierre de caja ─────────────────────────────────────────────────────────────
const CierreSchema = z.object({
  fecha:       z.string(),
  saldo_sistema: z.number(),
  saldo_real:  z.number(),
  notas:       z.string().nullable().optional(),
})

export async function registrarCierreCaja(payload: unknown) {
  const parsed = CierreSchema.safeParse(payload)
  if (!parsed.success) throw new Error(parsed.error.errors[0].message)

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const diferencia = parsed.data.saldo_real - parsed.data.saldo_sistema

  const { error } = await supabase.from('cierres_caja').insert({
    fecha:         parsed.data.fecha,
    saldo_sistema: parsed.data.saldo_sistema,
    saldo_real:    parsed.data.saldo_real,
    diferencia,
    estado:        'CERRADO',
    notas:         parsed.data.notas ?? null,
    usuario_id:    user.id,
  })
  if (error) throw new Error(error.message)
}
