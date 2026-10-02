/**
 * Datos del negocio, en un solo lugar.
 *
 * Estaban repetidos en el sidebar, el login, el título del navegador y los tres
 * comprobantes imprimibles, así que cambiar el nombre obligaba a tocar siete
 * archivos y era fácil dejarse uno viejo.
 */
export const NEGOCIO = {
  nombre: 'Aberturas SP',
  rubro:  'Sistema de gestión interno',
} as const
