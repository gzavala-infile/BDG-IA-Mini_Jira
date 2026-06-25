import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const _accessSecret = process.env['JWT_SECRET']
const _refreshSecret = process.env['JWT_REFRESH_SECRET']
if (!_accessSecret || !_refreshSecret) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET environment variables are required')
}
const ACCESS_SECRET: string = _accessSecret
const REFRESH_SECRET: string = _refreshSecret

export type AccessPayload = { userId: string; rol: 'admin' | 'usuario'; jti: string }
export type RefreshPayload = { userId: string }

export function signAccess(userId: string, rol: string): string {
  return jwt.sign({ userId, rol, jti: crypto.randomUUID() }, ACCESS_SECRET, {
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
