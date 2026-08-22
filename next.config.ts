import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Evita que Next.js/Turbopack intente bundlear el SDK de Anthropic,
  // que usa APIs de Node.js nativas (crypto, stream, etc.)
  serverExternalPackages: ['@anthropic-ai/sdk'],
}

export default nextConfig
