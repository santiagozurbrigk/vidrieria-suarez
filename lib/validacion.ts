// Helpers de Zod compartidos por las Server Actions.
//
// El problema que resuelven: los formularios mandan FormData, así que un campo
// opcional que el usuario no completó llega como '' (string vacío), no como
// undefined. Eso rompía dos cosas:
//
//   1. `z.enum([...]).optional()` rechaza '' — sólo acepta undefined. Por eso
//      no se podía guardar un proveedor con "— Sin especificar —" en Condición IVA.
//   2. Los '' que sí pasaban se guardaban tal cual en la base en vez de NULL,
//      ensuciando los datos y rompiendo cualquier índice único (todos los ''
//      colisionan entre sí).
//
// Todos los helpers de acá normalizan '' → null.

import { z } from 'zod'

/** Texto opcional: '' o ausente ⇒ null. */
export const textoOpcional = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))

/** Texto obligatorio, con mensaje propio. */
export function textoRequerido(mensaje: string) {
  return z.string().trim().min(1, mensaje)
}

/** Email opcional: '' o ausente ⇒ null; si viene algo, tiene que ser válido. */
export const emailOpcional = textoOpcional.refine(
  (v) => v === null || z.string().email().safeParse(v).success,
  { message: 'El email no es válido' },
)

/**
 * Enum opcional que además acepta '' como "sin especificar".
 * `z.enum([...]).optional()` no sirve para esto: rechaza el string vacío.
 */
export function enumOpcional<const T extends readonly [string, ...string[]]>(valores: T) {
  return textoOpcional.refine(
    (v) => v === null || (valores as readonly string[]).includes(v),
    { message: 'Valor no válido' },
  ) as unknown as z.ZodType<T[number] | null, z.ZodTypeDef, unknown>
}

/** Monto: acepta string de formulario, tiene que ser positivo. */
export const montoPositivo = z.coerce.number().positive('El monto debe ser mayor a cero')

/** Fecha 'YYYY-MM-DD'. */
export const fechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha no es válida')
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'La fecha no existe' })

/**
 * Valida y devuelve los datos, o lanza un Error con un mensaje legible.
 *
 * Se usa dentro de `ejecutar()`, que convierte el throw en `{ ok: false, error }`,
 * así que el mensaje sí llega al navegador en producción.
 */
export function parsear<T extends z.ZodTypeAny>(schema: T, payload: unknown): z.infer<T> {
  const resultado = schema.safeParse(payload)
  if (!resultado.success) {
    const primero = resultado.error.errors[0]
    const campo = primero.path.join('.')
    throw new Error(campo ? `${campo}: ${primero.message}` : primero.message)
  }
  return resultado.data
}
