'use server'

import Anthropic from '@anthropic-ai/sdk'
import type { BetaRequestDocumentBlock } from '@anthropic-ai/sdk/resources/beta/messages/messages'

export type ItemExtraido = {
  nombre: string
  cantidad: number
  costo_unitario: number
  subtotal: number
}

export type FacturaExtraida = {
  numero?: string
  fecha?: string
  tipo_comprobante?: 'FACTURA' | 'REMITO' | 'TICKET' | 'NOTA_CREDITO'
  items: ItemExtraido[]
  subtotal?: number
  iva?: number
  total?: number
  notas?: string
}

const PROMPT = `Analiza este comprobante de compra y extrae todos los datos disponibles en formato JSON.
Responde ÚNICAMENTE con el JSON, sin texto adicional antes ni después.

Formato requerido:
{
  "numero": "número de factura o comprobante (ej: 0001-00001234)",
  "fecha": "YYYY-MM-DD",
  "tipo_comprobante": "FACTURA" | "REMITO" | "TICKET" | "NOTA_CREDITO",
  "items": [
    {
      "nombre": "descripción del producto o servicio",
      "cantidad": 1.0,
      "costo_unitario": 1000.00,
      "subtotal": 1000.00
    }
  ],
  "subtotal": 0.00,
  "iva": 0.00,
  "total": 0.00,
  "notas": "observaciones si las hay"
}

Reglas:
- Omite campos que no puedas leer con seguridad
- La fecha debe estar en formato YYYY-MM-DD (año-mes-día)
- Los montos deben ser números sin símbolo de moneda
- Si hay descuentos, refléjalos en el subtotal de cada ítem
- Para tipo_comprobante elige el que mejor describe el documento`

export async function extraerFacturaDesdeArchivo(formData: FormData): Promise<FacturaExtraida> {
  const file = formData.get('archivo') as File | null
  if (!file || file.size === 0) throw new Error('No se recibió ningún archivo')

  const apiKey = process.env.ANTHROPIC_KEY
  if (!apiKey) throw new Error('Variable de entorno ANTHROPIC_KEY no configurada')

  const client = new Anthropic({ apiKey })

  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')
  const mediaType = file.type

  let text: string

  try {
    if (mediaType === 'application/pdf') {
      const docBlock: BetaRequestDocumentBlock = {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: base64 },
      }
      const response = await client.beta.messages.create({
        model: 'claude-opus-5',
        max_tokens: 1024,
        betas: ['pdfs-2024-09-25'],
        messages: [{
          role: 'user',
          content: [docBlock, { type: 'text', text: PROMPT }],
        }],
      })
      text = response.content.find((b) => b.type === 'text')?.text ?? ''
    } else {
      const imageMediaType = mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
      const response = await client.messages.create({
        model: 'claude-opus-5',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: imageMediaType, data: base64 } },
            { type: 'text', text: PROMPT },
          ],
        }],
      })
      text = response.content.find((b) => b.type === 'text')?.text ?? ''
    }
  } catch (apiErr: unknown) {
    // Re-throw as a plain Error so Next.js can serialize it back to the client
    const msg = apiErr instanceof Error ? apiErr.message : String(apiErr)
    throw new Error(`Error al consultar la IA: ${msg}`)
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('La IA no pudo extraer información del comprobante. Verificá que la imagen sea legible.')
  }

  try {
    const extracted = JSON.parse(jsonMatch[0]) as FacturaExtraida
    return { ...extracted, items: extracted.items ?? [] }
  } catch {
    throw new Error('Error al procesar la respuesta de la IA. Intentá de nuevo.')
  }
}
