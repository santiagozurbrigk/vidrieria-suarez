'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { conUsuario } from '@/lib/supabase/server'
import { ejecutar, type Resultado } from '@/lib/resultado'
import { emailOpcional, enumOpcional, parsear, textoOpcional, textoRequerido } from '@/lib/validacion'
import type { FacturaCompra, Proveedor } from '@/lib/supabase/types'

const CONDICIONES_IVA = ['RESPONSABLE_INSCRIPTO', 'MONOTRIBUTISTA', 'EXENTO', 'CONSUMIDOR_FINAL'] as const

const proveedorSchema = z.object({
  razon_social:  textoRequerido('La razón social es obligatoria'),
  cuit:          textoOpcional,
  condicion_iva: enumOpcional(CONDICIONES_IVA),
  contacto:      textoOpcional,
  telefono:      textoOpcional,
  email:         emailOpcional,
  direccion:     textoOpcional,
  alias_cbu:     textoOpcional,
  cbu:           textoOpcional,
  notas:         textoOpcional,
})

export async function crearProveedor(formData: FormData): Promise<Resultado<Proveedor>> {
  return ejecutar(async () => {
    const data = parsear(proveedorSchema, Object.fromEntries(formData))
    const { supabase } = await conUsuario()

    const { data: proveedor, error } = await supabase
      .from('proveedores')
      .insert(data)
      .select()
      .single()
    if (error) throw error

    revalidatePath('/proveedores')
    return proveedor
  })
}

export async function actualizarProveedor(id: string, formData: FormData): Promise<Resultado<Proveedor>> {
  return ejecutar(async () => {
    const data = parsear(proveedorSchema, Object.fromEntries(formData))
    const { supabase } = await conUsuario()

    const { data: proveedor, error } = await supabase
      .from('proveedores')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error

    revalidatePath('/proveedores')
    return proveedor
  })
}

// ── Facturas de compra ────────────────────────────────────────────────────────
//
// Un ítem trae `producto_id` (producto ya existente) o `nombre_nuevo` (producto
// a crear). La RPC crea los productos faltantes y la factura en una sola
// transacción: si la factura falla, los productos nuevos tampoco quedan.

const itemSchema = z
  .object({
    producto_id:    z.string().uuid().optional(),
    nombre_nuevo:   z.string().trim().min(1).optional(),
    categoria:      z.enum(['VIDRIO', 'ALUMINIO', 'ACCESORIO', 'INSUMO']).optional(),
    unidad_medida:  z.enum(['UNIDAD', 'M2', 'ML']).optional(),
    cantidad:       z.coerce.number().positive('La cantidad debe ser mayor a cero'),
    costo_unitario: z.coerce.number().min(0),
    subtotal:       z.coerce.number().min(0),
  })
  .refine((d) => !!d.producto_id || !!d.nombre_nuevo, {
    message: 'Cada ítem debe tener un producto existente o un nombre nuevo',
  })

const facturaCompraSchema = z.object({
  proveedor_id:     z.string().uuid('Seleccioná un proveedor'),
  numero:           textoOpcional,
  fecha:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha no es válida'),
  tipo_comprobante: z.string().trim().default('FACTURA'),
  subtotal:         z.coerce.number().min(0),
  iva:              z.coerce.number().min(0).default(0),
  total:            z.coerce.number().positive('El total debe ser mayor a cero'),
  notas:            textoOpcional,
  items:            z.array(itemSchema).min(1, 'La factura debe tener al menos un ítem'),
})

export async function registrarFacturaCompra(payload: unknown): Promise<Resultado<FacturaCompra>> {
  return ejecutar(async () => {
    const data = parsear(facturaCompraSchema, payload)
    const { supabase } = await conUsuario()

    const { data: factura, error } = await supabase.rpc('crear_factura_compra', {
      p_proveedor_id:     data.proveedor_id,
      p_fecha:            data.fecha,
      p_subtotal:         data.subtotal,
      p_total:            data.total,
      p_items:            data.items,
      p_tipo_comprobante: data.tipo_comprobante,
      p_iva:              data.iva,
      p_notas:            data.notas ?? undefined,
      // Omitido ⇒ la base asigna el siguiente número correlativo.
      p_numero:           data.numero ?? undefined,
    })
    if (error) throw error

    revalidatePath('/proveedores')
    revalidatePath('/compras')
    revalidatePath('/stock')
    revalidatePath('/precios')
    return factura
  })
}

// ── Margen por proveedor ──────────────────────────────────────────────────────

export async function actualizarMargenProveedor(
  proveedorId: string,
  margen: number,
): Promise<Resultado> {
  return ejecutar(async () => {
    const m = parsear(z.coerce.number().min(0).max(999, 'El margen no puede superar 999%'), margen)
    const { supabase } = await conUsuario()

    const { error } = await supabase
      .from('proveedores')
      .update({ margen_ganancia: m })
      .eq('id', proveedorId)
    if (error) throw error

    revalidatePath('/precios')
  })
}

/**
 * Re-aplica el margen actual del proveedor a todos los productos que alguna vez
 * se le compraron. Una sola sentencia en la base en vez de un UPDATE por
 * producto; devuelve cuántos actualizó.
 */
export async function recalcularPreciosProveedor(proveedorId: string): Promise<Resultado<number>> {
  return ejecutar(async () => {
    const { supabase } = await conUsuario()

    const { data: afectados, error } = await supabase.rpc('recalcular_precios_proveedor', {
      p_proveedor_id: proveedorId,
    })
    if (error) throw error

    revalidatePath('/precios')
    revalidatePath('/stock')
    return afectados ?? 0
  })
}
