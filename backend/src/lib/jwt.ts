import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const ACCESS_SECRET = process.env['JWT_SECRET'] ?? 'dev-secret'
const REFRESH_SECRET = process.env['JWT_REFRESH_SECRET'] ?? 'dev-refresh-secret'

export type AccessPayload = { userId: string; rol: 'admin' | 'usuario' }
export type RefreshPayload = { userId: string }

export function signAccess(userId: string, rol: string): string {
  return jwt.sign({ userId, rol }, ACCESS_SECRET, {
    expiresIn: '1h',
  } as jwt.SignOptions)
}

export function signRefresh(userId: string): string {
  return jwt.sign({ userId }, REFRESH_SECRET, {
    expiresIn: '7d',
  } as jwt.SignOptions)
}

export function verifyAccess(token: string): AccessPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessPayload
}

export function verifyRefresh(token: string): RefreshPayload {
  return jwt.verify(token, REFRESH_SECRET) as RefreshPayload
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
