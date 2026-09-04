// Tope de filas que trae cada listado.
//
// Antes las páginas pedían la tabla entera sin .limit(): con pocos cientos de
// filas anda, pero PostgREST corta en su propio máximo y a partir de ahí la
// app muestra datos incompletos sin avisar. Con un límite explícito y el
// `count` total, el listado sabe cuánto le falta y puede decirlo.
export const LIMITE_LISTADO = 300

/** Texto del aviso cuando el listado no entra completo. */
export function avisoListadoParcial(mostradas: number, total: number | null): string | null {
  if (total === null || total <= mostradas) return null
  return `Mostrando los ${mostradas} registros más recientes de ${total.toLocaleString('es-AR')}. Usá los filtros para acotar la búsqueda.`
}

/** La misma forma que T, pero sin nulls. Es lo que devuelve `conCeros`. */
export type NoNulo<T> = { [K in keyof T]: NonNullable<T[K]> }

/**
 * Normaliza la fila de una vista de resumen a números.
 *
 * PostgreSQL no puede garantizar la no-nulidad de una columna calculada, así
 * que `supabase gen types` declara `count(*)` y `sum(...)` como `number | null`
 * aunque en la práctica nunca sean null. Esto lo resuelve en un solo lugar en
 * vez de repartir `?? 0` por todo el JSX, y de paso cubre el caso de que la
 * consulta no devuelva ninguna fila (por ejemplo, si RLS la filtra entera).
 */
export function conCeros<T extends Record<string, number | null>>(
  fila: T | null | undefined,
  vacio: { [K in keyof T]: number },
): { [K in keyof T]: number } {
  if (!fila) return vacio
  const salida = { ...vacio }
  for (const clave of Object.keys(vacio) as (keyof T)[]) {
    salida[clave] = fila[clave] ?? 0
  }
  return salida
}
