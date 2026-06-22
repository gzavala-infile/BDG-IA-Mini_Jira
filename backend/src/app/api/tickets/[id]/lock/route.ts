import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { errResponse } from '@/lib/errors'
import { getAuth } from '@/lib/auth-guard'
import type { TicketLockRow, TicketLockWithUser, UsuarioPublico } from '@/lib/db.types'

export const runtime = 'nodejs'

const LOCK_TTL_SECONDS = 5 * 60 // 5 minutes

type RouteParams = { params: { id: string } }

function formatLock(row: TicketLockWithUser) {
  return {
    ticket_id: row.ticket_id,
    locked_by: row.usuario,
    locked_at: row.locked_at,
    expires_at: row.expires_at,
  }
}

// POST /api/tickets/:id/lock
// Acquire or renew a lock on a ticket.
// - If no active lock: create one (expires_at = now + TTL)
// - If active lock held by same user: renew (update expires_at)
// - If active lock held by another user: 409 with locker data
export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = getAuth(req)
  if (!auth.ok) return errResponse('unauthorized', 'Token inválido o ausente')

  const ticketId = Number(params.id)
  if (!Number.isInteger(ticketId)) return errResponse('not_found', 'Ticket no encontrado')

  // Verify ticket exists
  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, archived_at')
    .eq('id', ticketId)
    .single<{ id: number; archived_at: string | null }>()

  if (!ticket) return errResponse('not_found', 'Ticket no encontrado')
  if (ticket.archived_at !== null) return errResponse('archived', 'No se puede bloquear un ticket archivado')

  // Look up any existing lock
  const { data: existing } = await supabase
    .from('ticket_locks')
    .select('ticket_id, locked_by, locked_at, expires_at')
    .eq('ticket_id', ticketId)
    .single<TicketLockRow>()

  const now = new Date()
  const expiresAt = new Date(now.getTime() + LOCK_TTL_SECONDS * 1000).toISOString()

  if (existing) {
    const lockExpired = new Date(existing.expires_at) < now

    if (!lockExpired && existing.locked_by !== auth.user.userId) {
      // Active lock held by someone else — return 409 with locker info
      const { data: lockerRaw } = await supabase
        .from('usuarios')
        .select('id, nombre, email, rol, activo, creado_en, actualizado_en')
        .eq('id', existing.locked_by)
        .single<UsuarioPublico>()

      return NextResponse.json(
        {
          error: 'locked',
          message: 'El ticket está bloqueado por otro usuario',
          lock: {
            ticket_id: existing.ticket_id,
            locked_by: lockerRaw ?? { id: existing.locked_by },
            locked_at: existing.locked_at,
            expires_at: existing.expires_at,
          },
        },
        { status: 409 },
      )
    }

    // Either expired OR same user — renew
    const { data: renewed } = await supabase
      .from('ticket_locks')
      .update({ locked_by: auth.user.userId, locked_at: now.toISOString(), expires_at: expiresAt })
      .eq('ticket_id', ticketId)
      .select('ticket_id, locked_by, locked_at, expires_at, usuario:locked_by(id, nombre, email, rol, activo, creado_en, actualizado_en)')
      .single<TicketLockWithUser>()

    if (!renewed) return errResponse('validation', 'Error al renovar el lock')
    return NextResponse.json(formatLock(renewed), { status: 200 })
  }

  // No lock — create new
  const { data: created } = await supabase
    .from('ticket_locks')
    .insert({ ticket_id: ticketId, locked_by: auth.user.userId, expires_at: expiresAt })
    .select('ticket_id, locked_by, locked_at, expires_at, usuario:locked_by(id, nombre, email, rol, activo, creado_en, actualizado_en)')
    .single<TicketLockWithUser>()

  if (!created) return errResponse('validation', 'Error al crear el lock')
  return NextResponse.json(formatLock(created), { status: 201 })
}

// DELETE /api/tickets/:id/lock
// Release a lock. Only the lock holder or an Admin may release it.
// Idempotent: 204 if lock doesn't exist.
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = getAuth(req)
  if (!auth.ok) return errResponse('unauthorized', 'Token inválido o ausente')

  const ticketId = Number(params.id)
  if (!Number.isInteger(ticketId)) return errResponse('not_found', 'Ticket no encontrado')

  const { data: existing } = await supabase
    .from('ticket_locks')
    .select('ticket_id, locked_by, expires_at')
    .eq('ticket_id', ticketId)
    .single<Pick<TicketLockRow, 'ticket_id' | 'locked_by' | 'expires_at'>>()

  // Idempotent — no lock is fine
  if (!existing) return new NextResponse(null, { status: 204 })

  const isHolder = existing.locked_by === auth.user.userId
  const isAdmin = auth.user.rol === 'admin'
  const lockExpired = new Date(existing.expires_at) < new Date()

  // Allow release if: expired (cleanup), same user, or admin
  if (!lockExpired && !isHolder && !isAdmin) {
    return errResponse('forbidden', 'Solo el titular del lock o un Admin puede liberarlo')
  }

  await supabase.from('ticket_locks').delete().eq('ticket_id', ticketId)
  return new NextResponse(null, { status: 204 })
}
