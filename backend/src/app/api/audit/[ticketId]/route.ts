import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { errResponse } from '@/lib/errors'
import { getAuth } from '@/lib/auth-guard'
import type { AuditLogWithUser, UsuarioPublico } from '@/lib/db.types'

export const runtime = 'nodejs'

type RouteParams = { params: { ticketId: string } }

// GET /api/audit/:ticketId — read-only audit trail for a ticket
export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = getAuth(req)
  if (!auth.ok) return errResponse('unauthorized', 'Token inválido o ausente')
  if (auth.user.rol !== 'admin') return errResponse('forbidden', 'Acceso restringido a administradores')

  const ticketId = Number(params.ticketId)
  if (!Number.isInteger(ticketId)) return errResponse('not_found', 'Ticket no encontrado')

  // Verify the ticket exists (archived tickets are still auditable)
  const { data: ticket } = await supabase
    .from('tickets')
    .select('id')
    .eq('id', ticketId)
    .single<{ id: number }>()

  if (!ticket) return errResponse('not_found', 'Ticket no encontrado')

  const { data, error } = await supabase
    .from('audit_log')
    .select('id, ticket_id, usuario_id, campo, valor_anterior, valor_nuevo, creado_en, usuario:usuario_id(id, nombre, email, rol, activo, creado_en, actualizado_en)')
    .eq('ticket_id', ticketId)
    .order('creado_en', { ascending: true })

  if (error) {
    console.error('[supabase error]', error.message)
    return errResponse('validation', 'Error al procesar la solicitud')
  }

  const rows = (data ?? []).map((entry) => {
    const e = entry as unknown as AuditLogWithUser & { usuario: UsuarioPublico | null }
    return {
      id: e.id,
      ticket_id: e.ticket_id,
      campo: e.campo,
      valor_anterior: e.valor_anterior,
      valor_nuevo: e.valor_nuevo,
      creado_en: e.creado_en,
      usuario: e.usuario,
    }
  })

  return NextResponse.json(rows)
}
