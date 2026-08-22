import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Evita que Next.js/Turbopack intente bundlear el SDK de Anthropic,
  // que usa APIs de Node.js nativas (crypto, stream, etc.)
  serverExternalPackages: ['@anthropic-ai/sdk'],

  // Permitir imágenes y PDFs de hasta 10 MB en Server Actions
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

export default nextConfig
