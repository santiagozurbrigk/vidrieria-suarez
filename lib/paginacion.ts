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
