import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Hoisted mock state ───────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  const singleQueue: Array<{ data: unknown; error: unknown }> = []
  let chainResult: { data: unknown; error: unknown } = { data: [], error: null }

  const singleFn = vi.fn(() =>
    Promise.resolve(singleQueue.shift() ?? { data: null, error: null }),
  )
  const rpcFn = vi.fn()
  const getAuthFn = vi.fn()

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
    rpcFn,
    getAuthFn,
    setChainResult: (r: typeof chainResult) => { chainResult = r },
    supabase: { from: vi.fn().mockReturnValue(chain), rpc: rpcFn },
  }
})

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase',    () => ({ supabase: mocks.supabase }))
vi.mock('@/lib/auth-guard',  () => ({ getAuth: mocks.getAuthFn }))

// ── Imports (after mocks) ────────────────────────────────────────────────────

import { GET as ticketsGET, POST as ticketsPOST }     from '@/app/api/tickets/route'
import { GET as ticketGET, PATCH as ticketPATCH }     from '@/app/api/tickets/[id]/route'
import { PATCH as archivePATCH }                       from '@/app/api/tickets/[id]/archive/route'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ADMIN_AUTH  = { ok: true as const, user: { userId: 'admin-uuid', rol: 'admin'   as const } }
const USER_AUTH   = { ok: true as const, user: { userId: 'user-uuid',  rol: 'usuario' as const } }

// Raw row as Supabase would return it (matches TicketWithRelations shape)
const TICKET_RAW = {
  id: 1,
  titulo: 'Ticket de prueba',
  descripcion: null,
  estado: 'por_hacer',
  prioridad: 'media',
  version: 1,
  archived_at: null,
  creado_en: '2026-01-01T00:00:00Z',
  actualizado_en: '2026-01-01T00:00:00Z',
  creado_por_id: 'admin-uuid',
  asignado_a_id: null,
  creado_por: {
    id: 'admin-uuid', nombre: 'Admin', email: 'admin@test.dev',
    rol: 'admin', activo: true,
    creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z',
  },
  asignado_a: null,
  ticket_etiquetas: [],
  comentarios: [{ count: 0 }],
}

const INACTIVE_USER_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'

function makeReq(
  path: string,
  options: { method?: string; body?: unknown; searchParams?: Record<string, string> } = {},
) {
  const url = new URL(`http://localhost:3001${path}`)
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  return new NextRequest(url, {
    method: options.method ?? 'GET',
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })
}

const PARAMS_1 = { params: { id: '1' } }

beforeEach(() => {
  mocks.singleQueue.length = 0
  mocks.setChainResult({ data: [], error: null })
  vi.clearAllMocks()
  mocks.getAuthFn.mockReturnValue(ADMIN_AUTH)
})

// ════════════════════════════════════════════════════════════════════════════
// GET /api/tickets
// ════════════════════════════════════════════════════════════════════════════

describe('GET /api/tickets', () => {
  it('happy path — usuario autenticado recibe lista de tickets activos (HU-03 S1)', async () => {
    // Given: hay 2 tickets activos en la BD sin archived_at
    mocks.setChainResult({
      data: [TICKET_RAW, { ...TICKET_RAW, id: 2, titulo: 'Segundo ticket' }],
      error: null,
    })

    // When: GET /api/tickets con token válido
    const res = await ticketsGET(makeReq('/api/tickets'))

    // Then: 200 con array de 2 tickets formateados (archived_at excluido de listado)
    expect(res.status).toBe(200)
    const body = await res.json() as unknown[]
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(2)
    expect((body[0] as Record<string, unknown>)).toMatchObject({
      id: 1, titulo: 'Ticket de prueba', estado: 'por_hacer',
    })
  })

  it('error de validación — sin Authorization retorna 401', async () => {
    // Given: usuario sin token de acceso
    mocks.getAuthFn.mockReturnValue({ ok: false })

    // When: GET sin header Authorization
    const res = await ticketsGET(makeReq('/api/tickets'))

    // Then: 401 unauthorized — acceso denegado
    expect(res.status).toBe(401)
    expect((await res.json() as Record<string, unknown>).error).toBe('unauthorized')
  })

  it('edge case — filtro por estado solo devuelve tickets con ese estado (HU-03 S4)', async () => {
    // Given: la BD aplica el filtro y devuelve solo tickets bloqueados
    mocks.setChainResult({
      data: [{ ...TICKET_RAW, estado: 'bloqueado' }],
      error: null,
    })

    // When: GET con queryParam ?estado=bloqueado
    const res = await ticketsGET(makeReq('/api/tickets', { searchParams: { estado: 'bloqueado' } }))

    // Then: 200 con solo 1 ticket y estado correcto — conteo refleja filtro activo
    expect(res.status).toBe(200)
    const body = await res.json() as Array<Record<string, unknown>>
    expect(body).toHaveLength(1)
    expect(body[0]!.estado).toBe('bloqueado')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// POST /api/tickets
// ════════════════════════════════════════════════════════════════════════════

describe('POST /api/tickets', () => {
  it('happy path — crea ticket con solo título; estado=por_hacer y prioridad=media por defecto (HU-02 S1)', async () => {
    // Given: usuario autenticado, body mínimo con solo el título requerido
    mocks.singleQueue.push({ data: { id: 1 }, error: null })        // insert → devuelve id
    mocks.singleQueue.push({ data: TICKET_RAW,  error: null })       // fetch ticket completo

    // When: POST con solo el campo "titulo"
    const res = await ticketsPOST(makeReq('/api/tickets', {
      method: 'POST',
      body: { titulo: 'Ticket de prueba' },
    }))

    // Then: 201 con ticket en "por_hacer" y prioridad "media"
    expect(res.status).toBe(201)
    const body = await res.json() as Record<string, unknown>
    expect(body.estado).toBe('por_hacer')
    expect(body.prioridad).toBe('media')
    expect(body).not.toHaveProperty('password_hash')
  })

  it('error de validación — body sin título retorna 400 (regla de negocio §8: título requerido)', async () => {
    // Given: body sin el campo requerido "titulo"

    // When: POST sin titulo
    const res = await ticketsPOST(makeReq('/api/tickets', {
      method: 'POST',
      body: { descripcion: 'Sin título' },
    }))

    // Then: 400 con error de validación — no se crea ningún ticket
    expect(res.status).toBe(400)
    expect((await res.json() as Record<string, unknown>).error).toBe('validation')
  })

  it('edge case — asignar a usuario inactivo retorna 422 (EC-02 S2)', async () => {
    // Given: el usuario destino existe en BD pero tiene activo=false
    mocks.singleQueue.push({ data: { id: INACTIVE_USER_UUID, activo: false }, error: null })

    // When: POST con asignado_a_id de un usuario desactivado
    const res = await ticketsPOST(makeReq('/api/tickets', {
      method: 'POST',
      body: { titulo: 'Ticket nuevo', asignado_a_id: INACTIVE_USER_UUID },
    }))

    // Then: 422 inactive_user — asignado_a no cambia, el ticket NO se crea
    expect(res.status).toBe(422)
    expect((await res.json() as Record<string, unknown>).error).toBe('inactive_user')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// GET /api/tickets/:id
// ════════════════════════════════════════════════════════════════════════════

describe('GET /api/tickets/:id', () => {
  it('happy path — devuelve ticket con comentarios ordenados ASC', async () => {
    // Given: ticket existe con 1 comentario en BD
    mocks.singleQueue.push({ data: TICKET_RAW, error: null })
    const MOCK_COMMENT = {
      id: 1, texto: 'Primer comentario', ticket_id: 1,
      autor_id: 'admin-uuid', creado_en: '2026-01-02T00:00:00Z', autor: null,
    }
    mocks.setChainResult({ data: [MOCK_COMMENT], error: null }) // comentarios direct-await

    // When: GET /api/tickets/1
    const res = await ticketGET(makeReq('/api/tickets/1'), PARAMS_1)

    // Then: 200 con ticket y comentarios incluidos
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body.id).toBe(1)
    expect(Array.isArray(body.comentarios)).toBe(true)
    expect((body.comentarios as unknown[]).length).toBe(1)
  })

  it('error de validación — sin Authorization retorna 401', async () => {
    // Given: sin autenticación
    mocks.getAuthFn.mockReturnValue({ ok: false })

    // When: GET sin token
    const res = await ticketGET(makeReq('/api/tickets/1'), PARAMS_1)

    // Then: 401
    expect(res.status).toBe(401)
  })

  it('edge case — ticket no existe retorna 404 (not_found)', async () => {
    // Given: la BD no tiene ningún ticket con ese ID
    mocks.singleQueue.push({ data: null, error: null })

    // When: GET con ID inexistente
    const res = await ticketGET(makeReq('/api/tickets/999'), { params: { id: '999' } })

    // Then: 404 not_found — el recurso no existe
    expect(res.status).toBe(404)
    expect((await res.json() as Record<string, unknown>).error).toBe('not_found')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// PATCH /api/tickets/:id
// ════════════════════════════════════════════════════════════════════════════

describe('PATCH /api/tickets/:id', () => {
  it('happy path — admin actualiza el estado del ticket correctamente', async () => {
    // Given: admin autenticado, ticket en v1, no archivado
    mocks.singleQueue.push({
      data: { id: 1, version: 1, archived_at: null, creado_por_id: 'otro-usuario' },
      error: null,
    })
    mocks.rpcFn.mockResolvedValueOnce({ data: null, error: null })
    mocks.singleQueue.push({
      data: { ...TICKET_RAW, estado: 'en_progreso', version: 2 },
      error: null,
    })

    // When: PATCH con version correcta y nuevo estado
    const res = await ticketPATCH(makeReq('/api/tickets/1', {
      method: 'PATCH',
      body: { version: 1, estado: 'en_progreso' },
    }), PARAMS_1)

    // Then: 200 con ticket actualizado — version incrementada en servidor
    expect(res.status).toBe(200)
    expect((await res.json() as Record<string, unknown>).estado).toBe('en_progreso')
  })

  it('error de validación — body sin "version" retorna 400 (Zod: version requerido)', async () => {
    // Given: body sin el campo "version" que el contrato exige siempre

    // When: PATCH omitiendo version
    const res = await ticketPATCH(makeReq('/api/tickets/1', {
      method: 'PATCH',
      body: { estado: 'en_progreso' }, // falta version
    }), PARAMS_1)

    // Then: 400 validation — no se ejecuta ninguna actualización
    expect(res.status).toBe(400)
    expect((await res.json() as Record<string, unknown>).error).toBe('validation')
  })

  it('edge case — conflicto de versión retorna 409 (HU-02 S6 — edición simultánea)', async () => {
    // Given: ticket en BD tiene version=5 (otro usuario editó primero)
    //        el cliente envía version=4 (su versión local ya está desactualizada)
    mocks.singleQueue.push({
      data: { id: 1, version: 5, archived_at: null, creado_por_id: 'admin-uuid' },
      error: null,
    })

    // When: PATCH con versión desactualizada
    const res = await ticketPATCH(makeReq('/api/tickets/1', {
      method: 'PATCH',
      body: { version: 4, titulo: 'Cambio tardío' },
    }), PARAMS_1)

    // Then: 409 version_conflict — los cambios del primero se preservan sin alteración
    expect(res.status).toBe(409)
    expect((await res.json() as Record<string, unknown>).error).toBe('version_conflict')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// PATCH /api/tickets/:id/archive
// ════════════════════════════════════════════════════════════════════════════

describe('PATCH /api/tickets/:id/archive', () => {
  it('happy path — admin archiva ticket activo; archived_at queda seteado', async () => {
    // Given: admin autenticado, ticket existe y está activo (archived_at=null)
    mocks.singleQueue.push({
      data: { id: 1, creado_por_id: 'otro-usuario', archived_at: null },
      error: null,
    })
    mocks.singleQueue.push({
      data: { ...TICKET_RAW, archived_at: '2026-06-01T00:00:00Z' },
      error: null,
    })

    // When: PATCH /archive
    const res = await archivePATCH(makeReq('/api/tickets/1/archive', { method: 'PATCH' }), PARAMS_1)

    // Then: 200 con ticket donde archived_at != null — ticket en solo lectura
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body.archived_at).not.toBeNull()
  })

  it('error de validación — usuario sin permiso retorna 403 (HU-02 S4)', async () => {
    // Given: usuario normal (rol "usuario") que NO creó el ticket
    mocks.getAuthFn.mockReturnValue(USER_AUTH)
    mocks.singleQueue.push({
      data: { id: 1, creado_por_id: 'otro-usuario', archived_at: null },
      error: null,
    })

    // When: usuario intenta archivar un ticket ajeno
    const res = await archivePATCH(makeReq('/api/tickets/1/archive', { method: 'PATCH' }), PARAMS_1)

    // Then: 403 forbidden — el sistema rechaza la acción, los datos no cambian
    expect(res.status).toBe(403)
    expect((await res.json() as Record<string, unknown>).error).toBe('forbidden')
  })

  it('edge case — EC-01: admin archiva; PATCH posterior del otro usuario recibe 403 "archived"', async () => {
    // Given: admin archiva el ticket #1
    mocks.getAuthFn.mockReturnValue(ADMIN_AUTH)
    mocks.singleQueue.push({
      data: { id: 1, creado_por_id: 'otro-usuario', archived_at: null },
      error: null,
    })
    mocks.singleQueue.push({
      data: { ...TICKET_RAW, archived_at: '2026-06-01T00:00:00Z' },
      error: null,
    })

    const archiveRes = await archivePATCH(
      makeReq('/api/tickets/1/archive', { method: 'PATCH' }), PARAMS_1,
    )
    expect(archiveRes.status).toBe(200)

    // When: usuario B (creador original) intenta editar el ticket ya archivado
    mocks.singleQueue.push({
      data: { id: 1, version: 1, archived_at: '2026-06-01T00:00:00Z', creado_por_id: 'otro-usuario' },
      error: null,
    })

    const editRes = await ticketPATCH(makeReq('/api/tickets/1', {
      method: 'PATCH',
      body: { version: 1, titulo: 'Cambio tardío' },
    }), PARAMS_1)

    // Then: 403 "archived" — los cambios del usuario B no se persisten
    expect(editRes.status).toBe(403)
    expect((await editRes.json() as Record<string, unknown>).error).toBe('archived')
  })
})
