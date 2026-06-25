import { type NextRequest } from 'next/server'
import { verifyAccess, type AccessPayload } from '@/lib/jwt'
import { isTokenRevoked } from '@/lib/token-blocklist'

type AuthResult =
  | { ok: true; user: AccessPayload }
  | { ok: false }

export function getAuth(req: NextRequest): AuthResult {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return { ok: false }
  try {
    const user = verifyAccess(header.slice(7))
    if (isTokenRevoked(user.jti)) return { ok: false }
    return { ok: true, user }
  } catch {
    return { ok: false }
  }
}
