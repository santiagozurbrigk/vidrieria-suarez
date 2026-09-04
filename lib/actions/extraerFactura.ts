'use server'

import Anthropic from '@anthropic-ai/sdk'
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema'
import { z } from 'zod'
import { conUsuario } from '@/lib/supabase/server'
import { ejecutar, type Resultado } from '@/lib/resultado'

// El modelo devuelve null en los campos que no puede leer con seguridad.
// Se usa .nullable() en vez de .optional() porque el modo de salida estructurada
// exige que todas las claves estén presentes en el esquema.
const itemSchema = z.object({
  nombre:         z.string(),
  cantidad:       z.number(),
  costo_unitario: z.number(),
  subtotal:       z.number(),
})

const facturaExtraidaSchema = z.object({
  numero:           z.string().nullable(),
  fecha:            z.string().nullable(),
  tipo_comprobante: z.enum(['FACTURA', 'REMITO', 'TICKET', 'NOTA_CREDITO']).nullable(),
  items:            z.array(itemSchema),
  subtotal:         z.number().nullable(),
  iva:              z.number().nullable(),
  total:            z.number().nullable(),
  notas:            z.string().nullable(),
})

export type ItemExtraido = z.infer<typeof itemSchema>
export type FacturaExtraida = z.infer<typeof facturaExtraidaSchema>

// El mismo contrato en JSON Schema, que es lo que consume la API para forzar
// una salida estructurada. Con esto la respuesta siempre es JSON válido: se
// puede borrar el /\{[\s\S]*\}/ con el que antes se pescaba el objeto del texto.
const ESQUEMA_SALIDA = {
  type: 'object',
  properties: {
    numero:           { type: ['string', 'null'] },
    fecha:            { type: ['string', 'null'], description: 'YYYY-MM-DD' },
    tipo_comprobante: { type: ['string', 'null'], enum: ['FACTURA', 'REMITO', 'TICKET', 'NOTA_CREDITO', null] },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nombre:         { type: 'string' },
          cantidad:       { type: 'number' },
          costo_unitario: { type: 'number' },
          subtotal:       { type: 'number' },
        },
        required: ['nombre', 'cantidad', 'costo_unitario', 'subtotal'],
        additionalProperties: false,
      },
    },
    subtotal: { type: ['number', 'null'] },
    iva:      { type: ['number', 'null'] },
    total:    { type: ['number', 'null'] },
    notas:    { type: ['string', 'null'] },
  },
  required: ['numero', 'fecha', 'tipo_comprobante', 'items', 'subtotal', 'iva', 'total', 'notas'],
  additionalProperties: false,
} as const

const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
const TAMANIO_MAXIMO = 10 * 1024 * 1024 // coincide con serverActions.bodySizeLimit

type TipoImagen = (typeof TIPOS_IMAGEN)[number]

const PROMPT = `Analizá este comprobante de compra y extraé todos los datos que puedas leer.

Reglas:
- Si un campo no se puede leer con seguridad, devolvelo como null en vez de inventarlo.
- La fecha va en formato YYYY-MM-DD (año-mes-día).
- Los montos son números, sin símbolo de moneda ni separadores de miles.
- Si hay descuentos, reflejalos en el subtotal de cada ítem.
- En tipo_comprobante elegí el que mejor describa el documento.`

/**
 * Extrae los datos de una factura a partir de una foto o un PDF.
 *
 * Devuelve un resultado en vez de lanzar: Next.js reemplaza el mensaje de las
 * excepciones de Server Actions por un digest genérico en producción, así que
 * un throw acá llegaría al navegador como un error ilegible.
 */
export async function extraerFacturaDesdeArchivo(
  formData: FormData,
): Promise<Resultado<FacturaExtraida>> {
  return ejecutar(async () => {
    // Es la única action que gasta créditos de una API externa: exigir sesión
    // antes de tocar la red.
    await conUsuario()

    const archivo = formData.get('archivo')
    if (!(archivo instanceof File) || archivo.size === 0) {
      throw new Error('No se recibió ningún archivo.')
    }
    if (archivo.size > TAMANIO_MAXIMO) {
      throw new Error('El archivo supera los 10 MB. Sacá la foto con menos resolución.')
    }

    const esPdf = archivo.type === 'application/pdf'
    const esImagen = (TIPOS_IMAGEN as readonly string[]).includes(archivo.type)
    if (!esPdf && !esImagen) {
      throw new Error('Formato no soportado. Usá JPG, PNG, WEBP, GIF o PDF.')
    }

    const apiKey = process.env.ANTHROPIC_KEY
    if (!apiKey) {
      throw new Error('Falta configurar la variable de entorno ANTHROPIC_KEY.')
    }

    const base64 = Buffer.from(await archivo.arrayBuffer()).toString('base64')
    const client = new Anthropic({ apiKey })

    // El bloque del documento va antes del texto. Los PDFs ya no necesitan
    // header beta: van por la API estable igual que las imágenes.
    const documento: Anthropic.ContentBlockParam = esPdf
      ? {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64 },
        }
      : {
          type: 'image',
          source: { type: 'base64', media_type: archivo.type as TipoImagen, data: base64 },
        }

    const respuesta = await client.messages.parse({
      model: 'claude-opus-5',
      // Una factura con muchos renglones no entra en 1024 tokens: la respuesta
      // se cortaba por la mitad y el parseo fallaba con un error engañoso.
      max_tokens: 16000,
      // Extracción rutinaria: no hace falta el esfuerzo por defecto.
      output_config: {
        effort: 'medium',
        format: jsonSchemaOutputFormat(ESQUEMA_SALIDA),
      },
      messages: [{ role: 'user', content: [documento, { type: 'text', text: PROMPT }] }],
    })

    if (respuesta.stop_reason === 'refusal') {
      throw new Error('El modelo no pudo procesar este documento.')
    }

    if (!respuesta.parsed_output) {
      throw new Error('No se pudo leer el comprobante. Verificá que la imagen sea legible.')
    }

    // Segunda validación con Zod: la salida estructurada garantiza la forma,
    // esto garantiza además el tipo exacto del lado de TypeScript.
    return facturaExtraidaSchema.parse(respuesta.parsed_output)
  })
}
