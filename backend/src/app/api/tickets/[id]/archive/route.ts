import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { errResponse } from '@/lib/errors'
import { getAuth } from '@/lib/auth-guard'
import { formatTicket, TICKET_SELECT, type TicketWithRelations } from '@/lib/db.types'

export const runtime = 'nodejs'

type RouteParams = { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = getAuth(req)
  if (!auth.ok) return errResponse('unauthorized', 'Token inválido o ausente')

  const ticketId = Number(params.id)
  if (!Number.isInteger(ticketId)) return errResponse('not_found', 'Ticket no encontrado')

  const { data: existing } = await supabase
    .from('tickets')
    .select('id, creado_por_id, archived_at')
    .eq('id', ticketId)
    .single<Pick<TicketWithRelations, 'id' | 'creado_por_id' | 'archived_at'>>()

  if (!existing) return errResponse('not_found', 'Ticket no encontrado')

  const isAdmin = auth.user.rol === 'admin'
  const isCreator = existing.creado_por_id === auth.user.userId

  if (!isAdmin && !isCreator) {
    return errResponse('forbidden', 'No tienes permiso para archivar este ticket')
  }

  await supabase
    .from('tickets')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', ticketId)

  const { data: ticket } = await supabase
    .from('tickets')
    .select(TICKET_SELECT)
    .eq('id', ticketId)
    .single<TicketWithRelations>()

  if (!ticket) return errResponse('not_found', 'Ticket no encontrado')

  return NextResponse.json(formatTicket(ticket))
}
