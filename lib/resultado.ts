// Resultado tipado para las Server Actions.
//
// Por qué no simplemente `throw`: cuando una Server Action lanza una excepción,
// Next.js NO manda el mensaje al navegador en producción — lo reemplaza por un
// digest genérico ("An error occurred in the Server Components render..."). Así
// que todos los `catch (err) { setError(err.message) }` de los modales mostraban
// un texto inútil apenas se deployaba.
//
// La solución es no lanzar nunca a través del límite servidor→cliente y devolver
// siempre un resultado explícito. `lib/actions/extraerFactura.ts` ya lo hacía;
// acá se generaliza a todas las actions.

import { ZodError } from 'zod'

export type Resultado<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

/** Forma de los errores que devuelve postgrest-js. */
type ErrorPostgrest = {
  message: string
  code?: string
  details?: string | null
  hint?: string | null
}

function esErrorPostgrest(e: unknown): e is ErrorPostgrest {
  return (
    typeof e === 'object' &&
    e !== null &&
    'message' in e &&
    typeof (e as { message: unknown }).message === 'string'
  )
}

/** Traduce lo que venga a un mensaje que le sirva a quien está usando el sistema. */
export function mensajeDeError(e: unknown): string {
  if (e instanceof ZodError) {
    const primero = e.errors[0]
    const campo = primero.path.join('.')
    return campo ? `${campo}: ${primero.message}` : primero.message
  }

  if (esErrorPostgrest(e)) {
    switch (e.code) {
      // Nuestras funciones RPC usan RAISE EXCEPTION con mensajes ya redactados
      // para el usuario final.
      case 'P0001':
        return e.message

      case '23505':
        return e.message.includes('numero')
          ? 'Ya existe un comprobante con ese número.'
          : 'Ya existe un registro con esos datos.'

      case '23503':
        return 'No se puede completar: el registro está vinculado a otros datos.'

      case '23514':
        return 'Los datos no cumplen una validación de la base.'

      case '23502':
        return 'Falta completar un campo obligatorio.'

      // RLS o permisos insuficientes.
      case '42501':
      case 'PGRST301':
        return 'No tenés permisos para realizar esta operación.'

      case 'PGRST116':
        return 'No se encontró el registro.'
    }

    // Los mensajes de los triggers de negocio ya vienen redactados en español.
    if (e.message.includes('Stock insuficiente')) return e.message

    return e.message
  }

  if (e instanceof Error) return e.message
  return String(e)
}

/**
 * Envuelve el cuerpo de una Server Action y garantiza que nunca lance.
 *
 *   export async function crearX(fd: FormData): Promise<Resultado<X>> {
 *     return ejecutar(async () => { ...; return x })
 *   }
 */
export async function ejecutar<T>(fn: () => Promise<T>): Promise<Resultado<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (e) {
    console.error('[server action]', e)
    return { ok: false, error: mensajeDeError(e) }
  }
}
