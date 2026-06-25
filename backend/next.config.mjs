const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN
if (!FRONTEND_ORIGIN) {
  throw new Error('FRONTEND_ORIGIN environment variable is required')
}

const CORS_HEADERS = [
  { key: 'Access-Control-Allow-Origin', value: FRONTEND_ORIGIN },
  { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,DELETE,OPTIONS' },
  { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization' },
  { key: 'Access-Control-Allow-Credentials', value: 'true' },
]

const SECURITY_HEADERS = [
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://unpkg.com",
      "style-src 'self' 'unsafe-inline' https://unpkg.com",
      "img-src 'self' data: https:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
  },
]

/** @type {import('next').NextConfig} */
const config = {
  experimental: {
    typedRoutes: false,
  },
  async headers() {
    return [{ source: '/api/:path*', headers: [...CORS_HEADERS, ...SECURITY_HEADERS] }]
  },
}

export default config
