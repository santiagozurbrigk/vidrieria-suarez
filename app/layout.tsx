import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vidriería Suárez — Sistema de Gestión',
  description: 'Sistema interno de gestión para Vidriería Suárez',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
