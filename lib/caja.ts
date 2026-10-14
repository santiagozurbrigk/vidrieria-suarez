/**
 * Categorías de egreso del negocio.
 *
 * Son las mismas que el enum `categoria_egreso` de la base. PROVEEDOR es la
 * única que pide elegir a quién se le pagó, porque descuenta del saldo que se
 * le debe.
 */
export const CATEGORIAS_EGRESO = [
  { valor: 'PROVEEDOR',   label: 'Proveedor' },
  { valor: 'SERVICIO',    label: 'Servicio' },
  { valor: 'RETIRO',      label: 'Retiro' },
  { valor: 'VARIOS',      label: 'Varios' },
  { valor: 'VEHICULOS',   label: 'Vehículos' },
  { valor: 'COMBUSTIBLE', label: 'Combustible' },
] as const

export type CategoriaEgreso = (typeof CATEGORIAS_EGRESO)[number]['valor']

export const LABEL_CATEGORIA: Record<string, string> = Object.fromEntries(
  CATEGORIAS_EGRESO.map((c) => [c.valor, c.label]),
)

/**
 * Categorías de ingreso: las unidades del negocio.
 *
 * Son el enum `categoria_ingreso` de la base. Responden de dónde vino la plata
 * que entró, que es una pregunta distinta de la que responden las de egreso.
 */
export const CATEGORIAS_INGRESO = [
  { valor: 'GALPON',    label: 'Galpón' },
  { valor: 'VIDRIERIA', label: 'Vidriería' },
  { valor: 'NEGOCIO',   label: 'Negocio' },
] as const

export type CategoriaIngreso = (typeof CATEGORIAS_INGRESO)[number]['valor']

export const LABEL_CATEGORIA_INGRESO: Record<string, string> = Object.fromEntries(
  CATEGORIAS_INGRESO.map((c) => [c.valor, c.label]),
)

export const MEDIOS_PAGO = [
  'Efectivo', 'Transferencia', 'Tarjeta débito', 'Tarjeta crédito', 'Cheque', 'Otro',
] as const
