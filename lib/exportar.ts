// Utilidades de exportación Excel (SheetJS client-side)
import * as XLSX from 'xlsx'

export function exportarExcel(rows: Record<string, unknown>[], nombreHoja: string, nombreArchivo: string) {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)

  // Auto-width columns
  const maxWidths: number[] = []
  rows.forEach((row) => {
    Object.values(row).forEach((val, i) => {
      const len = String(val ?? '').length
      maxWidths[i] = Math.max(maxWidths[i] ?? 10, len)
    })
  })
  // Also consider header widths
  Object.keys(rows[0] ?? {}).forEach((key, i) => {
    maxWidths[i] = Math.max(maxWidths[i] ?? 10, key.length)
  })
  ws['!cols'] = maxWidths.map((w) => ({ wch: Math.min(w + 2, 50) }))

  XLSX.utils.book_append_sheet(wb, ws, nombreHoja)
  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`)
}
