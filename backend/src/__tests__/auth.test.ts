import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Hoisted mock state (must run before vi.mock factories) ──────────────────

const mocks = vi.hoisted(() => {
  const singleQueue: Array<{ data: unknown; error: unknown }> = []
  let chainResult: { data: unknown; error: unknown } = { data: null, error: null }

  const singleFn = vi.fn(() =>
    Promise.resolve(singleQueue.shift() ?? { data: null, error: null }),
  )

  const chain: Record<string, unknown> = {}
  const ret = () => chain
  for (const m of [
    'select', 'eq', 'order', 'not', 'is', 'in', 'gte', 'lte', 'or',
    'insert', 'update', 'delete', 'upsert',
  ]) { chain[m] = ret }
  chain.single = singleFn
  chain.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
    Promise.resolve(chainResult).then(resolve, reject)

  return {
    singleQueue,
    singleFn,
    setChainResult: (r: typeof chainResult) => { chainResult = r },
    supabase: { from: vi.fn().mockReturnValue(chain), rpc: vi.fn() },
  }
})

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase', () => ({ supabase: mocks.supabase }))

vi.mock('bcryptjs', () => ({ default: { compare: vi.fn(), hash: vi.fn() } }))

vi.mock('@/lib/jwt', () => ({
  signAccess:    vi.fn(() => 'mock.access.token'),
  signRefresh:   vi.fn(() => 'mock.refresh.token'),
  verifyAccess:  vi.fn(() => ({ userId: 'test-user-id', rol: 'admin' })),
  verifyRefresh: vi.fn(() => ({ userId: 'test-user-id' })),
  hashToken:     vi.fn(() => 'mock-token-hash'),
}))

// ── Imports (after mocks) ────────────────────────────────────────────────────

import bcrypt from 'bcryptjs'
import { POST as loginPOST }   from '@/app/api/auth/login/route'
import { POST as refreshPOST } from '@/app/api/auth/refresh/route'
import { POST as logoutPOST }  from '@/app/api/auth/logout/route'

// ── Shared fixtures ──────────────────────────────────────────────────────────

const MOCK_USER_ROW = {
  id: 'admin-uuid-001',
  nombre: 'Admin Test',
  email: 'admin@test.dev',
  password_hash: '$2a$12$mockhash',
  rol: 'admin',
  activo: true,
  creado_en: '2026-01-01T00:00:00Z',
  actualizado_en: '2026-01-01T00:00:00Z',
}

const MOCK_TOKEN_ROW = {
  id: 1,
  usuario_id: 'test-user-id',
  token_hash: 'mock-token-hash',
  revocado: false,
  expira_en: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
}

function post(path: string, body?: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost:3001${path}`, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mocks.singleQueue.length = 0
  mocks.setChainResult({ data: null, error: null })
  vi.clearAllMocks()
})

// ════════════════════════════════════════════════════════════════════════════
// POST /api/auth/login
// ════════════════════════════════════════════════════════════════════════════

describe('POST /api/auth/login', () => {
  it('happy path — credenciales válidas devuelven accessToken, refreshToken y datos del usuario', async () => {
    // Given: existe un usuario activo en BD con email y contraseña correctos
    mocks.singleQueue.push({ data: MOCK_USER_ROW, error: null })
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never)

    // When: POST con credenciales válidas
    const res = await loginPOST(post('/api/auth/login', {
      email: 'admin@test.dev',
      password: 'Password123!',
    }))

    // Then: 200 con tokens y objeto user (sin password_hash)
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body.accessToken).toBe('mock.access.token')
    expect(body.refreshToken).toBe('mock.refresh.token')
    expect(body.user).toMatchObject({ email: 'admin@test.dev', rol: 'admin' })
    expect(body.user).not.toHaveProperty('password_hash')
  })

  it('error de validación — body sin email retorna 400 con fieldErrors (Zod)', async () => {
    // Given: body incompleto sin el campo requerido "email"

    // When: POST con password pero sin email
    const res = await loginPOST(post('/api/auth/login', { password: 'algo' }))

    // Then: 400 con código "validation"
    expect(res.status).toBe(400)
    const body = await res.json() as Record<string, unknown>
    expect(body.error).toBe('validation')
  })

  it('edge case — contraseña incorrecta devuelve 401 genérico sin revelar cuál campo falló (HU-01 S3)', async () => {
    // Given: usuario existe en BD pero la contraseña no coincide
    mocks.singleQueue.push({ data: MOCK_USER_ROW, error: null })
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never)

    // When: POST con contraseña incorrecta
    const res = await loginPOST(post('/api/auth/login', {
      email: 'admin@test.dev',
      password: 'wrong-password',
    }))

    // Then: 401 con "invalid_credentials" — mensaje genérico que no distingue email vs contraseña
    expect(res.status).toBe(401)
    expect((await res.json() as Record<string, unknown>).error).toBe('invalid_credentials')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// POST /api/auth/refresh
// ════════════════════════════════════════════════════════════════════════════

describe('POST /api/auth/refresh', () => {
  it('happy path — refreshToken válido devuelve nuevo accessToken', async () => {
    // Given: token existe en BD, no está revocado, no expiró, usuario activo
    mocks.singleQueue.push({ data: MOCK_TOKEN_ROW, error: null })
    mocks.singleQueue.push({ data: { id: 'test-user-id', rol: 'admin', activo: true }, error: null })

    // When: POST con refreshToken válido
    const res = await refreshPOST(post('/api/auth/refresh', { refreshToken: 'valid.refresh.jwt' }))

    // Then: 200 con nuevo accessToken
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body.accessToken).toBe('mock.access.token')
    expect(body).not.toHaveProperty('refreshToken')
  })

  it('error de validación — body sin refreshToken retorna 401', async () => {
    // Given: body vacío sin el token requerido

    // When: POST sin refreshToken
    const res = await refreshPOST(post('/api/auth/refresh', {}))

    // Then: 401 unauthorized
    expect(res.status).toBe(401)
    expect((await res.json() as Record<string, unknown>).error).toBe('unauthorized')
  })

  it('edge case — token revocado retorna 401 (HU-01 S4 — sesión expirada/cerrada)', async () => {
    // Given: token encontrado en BD pero marcado como revocado (logout previo)
    mocks.singleQueue.push({ data: { ...MOCK_TOKEN_ROW, revocado: true }, error: null })

    // When: POST con token revocado
    const res = await refreshPOST(post('/api/auth/refresh', { refreshToken: 'revoked.token' }))

    // Then: 401 — el token ya no es válido, la sesión expiró
    expect(res.status).toBe(401)
    expect((await res.json() as Record<string, unknown>).error).toBe('unauthorized')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// POST /api/auth/logout
// ════════════════════════════════════════════════════════════════════════════

describe('POST /api/auth/logout', () => {
  it('happy path — logout con refreshToken invalida la sesión en servidor (HU-01 S5)', async () => {
    // Given: usuario autenticado con token válido en header y refreshToken en body

    // When: POST con Authorization y body con refreshToken
    const res = await logoutPOST(post(
      '/api/auth/logout',
      { refreshToken: 'valid.refresh.token' },
      { Authorization: 'Bearer valid.access.token' },
    ))

    // Then: 204 sin body — sesión invalidada en servidor
    expect(res.status).toBe(204)
  })

  it('error de validación — sin header Authorization retorna 401', async () => {
    // Given: request sin header de autenticación

    // When: POST sin token de acceso
    const res = await logoutPOST(post('/api/auth/logout', {}))

    // Then: 401 unauthorized
    expect(res.status).toBe(401)
    expect((await res.json() as Record<string, unknown>).error).toBe('unauthorized')
  })

  it('edge case — logout sin refreshToken en body retorna 204 (solo expira sesión cliente)', async () => {
    // Given: usuario autenticado pero no proporciona refreshToken (sesión móvil o token ya limpiado)

    // When: POST con Authorization pero body vacío
    const res = await logoutPOST(post(
      '/api/auth/logout',
      {},
      { Authorization: 'Bearer valid.access.token' },
    ))

    // Then: 204 igualmente — el servidor no hace nada, la sesión cliente expira sola
    expect(res.status).toBe(204)
  })
})
