import type { NextConfig } from 'next'

const config: NextConfig = {
  // API-only app — no static pages
  experimental: {
    typedRoutes: false,
  },
}

export default config
