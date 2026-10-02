import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { NEGOCIO } from '@/lib/negocio'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: NEGOCIO.nombre,
  description: NEGOCIO.rubro,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
