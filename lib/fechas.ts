// Helpers de fecha para el negocio.
//
// Todo lo que sea "hoy" o "el mes actual" tiene que resolverse en la zona
// horaria de la vidriería, no en UTC ni en la del servidor: en Vercel el
// servidor corre en UTC, así que `new Date().toISOString().slice(0, 10)`
// devuelve el día siguiente entre las 21:00 y la medianoche de Argentina.

export const ZONA_HORARIA = 'America/Argentina/Buenos_Aires'

// 'en-CA' formatea como YYYY-MM-DD, que es justo lo que espera PostgreSQL
// y lo que necesita un <input type="date">.
const formateadorISO = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_HORARIA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Fecha de hoy en la zona del negocio, como 'YYYY-MM-DD'. */
export function hoy(): string {
  return formateadorISO.format(new Date())
}

/** Mes actual en la zona del negocio, como 'YYYY-MM'. */
export function mesActual(): string {
  return hoy().slice(0, 7)
}

/** Año y mes actuales en la zona del negocio, como números. */
export function anioMesActual(): { anio: number; mes: number } {
  const [anio, mes] = hoy().split('-')
  return { anio: Number(anio), mes: Number(mes) }
}

/**
 * Rango de un mes para filtrar en PostgreSQL, con límite superior EXCLUSIVO.
 *
 * Nunca construir el borde como `${mes}-31`: en febrero eso es '2026-02-31',
 * una fecha inválida que PostgreSQL rechaza, y la consulta entera falla en
 * silencio. Con el primer día del mes siguiente el rango siempre es válido.
 *
 *   const { desde, hasta } = rangoMes('2026-02')
 *   query.gte('fecha', desde).lt('fecha', hasta)   // >= 2026-02-01, < 2026-03-01
 */
export function rangoMes(mes: string): { desde: string; hasta: string } {
  const [anio, mesNum] = mes.split('-').map(Number)
  const desde = `${mes}-01`
  const hasta =
    mesNum === 12
      ? `${anio + 1}-01-01`
      : `${anio}-${String(mesNum + 1).padStart(2, '0')}-01`
  return { desde, hasta }
}

/** Nombre legible del mes, p. ej. 'septiembre de 2026'. */
export function nombreMes(anio: number, mes: number): string {
  return new Date(Date.UTC(anio, mes - 1, 1)).toLocaleString('es-AR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

// ── Mostrar una fecha guardada ───────────────────────────────────────────────
//
// `movimientos_caja.fecha` es timestamptz, así que formatearla con el default
// del navegador la muestra en la zona de quien mira. Hay que fijarla en la del
// negocio, igual que al guardarla.

const formateadorCorto = new Intl.DateTimeFormat('es-AR', {
  timeZone: ZONA_HORARIA,
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
})

const formateadorConHora = new Intl.DateTimeFormat('es-AR', {
  timeZone: ZONA_HORARIA,
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

/** 'DD/MM/AA' en la zona del negocio. */
export function formatearFecha(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : formateadorCorto.format(d)
}

/** 'DD/MM/AA HH:mm' en la zona del negocio. */
export function formatearFechaHora(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : formateadorConHora.format(d)
}

/**
 * 'YYYY-MM-DD' en la zona del negocio, para precargar un <input type="date">.
 *
 * Cortar el ISO con slice(0, 10) daría el día en UTC, que entre las 21:00 y la
 * medianoche de Argentina ya es el siguiente.
 */
export function fechaParaInput(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? hoy() : formateadorISO.format(d)
}
