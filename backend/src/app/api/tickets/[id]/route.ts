import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { errResponse } from '@/lib/errors'
import { getAuth } from '@/lib/auth-guard'
import { TicketUpdateSchema } from '@/lib/shared'
import {
  formatTicket,
  TICKET_SELECT,
  type TicketWithRelations,
  type UsuarioRow,
  type ComentarioRow,
  type ComentarioWithAutor,
  type UsuarioPublico,
} from '@/lib/db.types'
import { upsertEtiquetas } from '../route'

export const runtime = 'nodejs'

type RouteParams = { params: { id: string } }

async function getTicketOrError(id: number) {
  const { data } = await supabase
    .from('tickets')
    .select(TICKET_SELECT)
    .eq('id', id)
    .single<TicketWithRelations>()
  return data
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = getAuth(req)
  if (!auth.ok) return errResponse('unauthorized', 'Token inválido o ausente')

  const ticketId = Number(params.id)
  if (!Number.isInteger(ticketId)) return errResponse('not_found', 'Ticket no encontrado')

  const ticket = await getTicketOrError(ticketId)
  if (!ticket) return errResponse('not_found', 'Ticket no encontrado')

  // Cargar comentarios con autor
  const { data: comentariosRaw } = await supabase
    .from('comentarios')
    .select('id, texto, ticket_id, autor_id, creado_en, autor:autor_id(id, nombre, email, rol, activo)')
    .eq('ticket_id', ticketId)
    .order('creado_en', { ascending: true })

  const comentarios: ComentarioWithAutor[] = (comentariosRaw ?? []).map((c) => ({
    ...(c as ComentarioRow),
    autor: (c as unknown as { autor: UsuarioPublico }).autor,
  }))

  return NextResponse.json({ ...formatTicket(ticket), comentarios })
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = getAuth(req)
  if (!auth.ok) return errResponse('unauthorized', 'Token inválido o ausente')

  const ticketId = Number(params.id)
  if (!Number.isInteger(ticketId)) return errResponse('not_found', 'Ticket no encontrado')

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return errResponse('validation', 'Body JSON inválido')
  }

  const parsed = TicketUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return errResponse('validation', parsed.error.flatten().fieldErrors)
  }

  const { version, titulo, descripcion, estado, prioridad, asignado_a_id, etiquetas } = parsed.data

  // Verify existence and permissions
  const { data: existing } = await supabase
    .from('tickets')
    .select('id, version, archived_at, creado_por_id')
    .eq('id', ticketId)
    .single<Pick<TicketWithRelations, 'id' | 'version' | 'archived_at' | 'creado_por_id'>>()

  if (!existing) return errResponse('not_found', 'Ticket no encontrado')
  if (existing.archived_at !== null) return errResponse('archived', 'El ticket está archivado y es solo lectura')

  const isAdmin = auth.user.rol === 'admin'
  const isCreator = existing.creado_por_id === auth.user.userId

  if (!isAdmin && !isCreator) {
    return errResponse('forbidden', 'No tienes permiso para editar este ticket')
  }
  if (!isAdmin && asignado_a_id !== undefined) {
    return errResponse('forbidden', 'Solo el Admin puede reasignar tickets')
  }

  if (existing.version !== version) {
    return errResponse('version_conflict', 'Otro usuario modificó este ticket mientras lo editabas. Recarga para ver los cambios.')
  }

  // Validate assignee before the atomic update
  if (asignado_a_id !== undefined && asignado_a_id !== null) {
    const { data: asignado } = await supabase
      .from('usuarios')
      .select('id, activo')
      .eq('id', asignado_a_id)
      .single<Pick<UsuarioRow, 'id' | 'activo'>>()

    if (!asignado) return errResponse('not_found', 'Usuario asignado no existe')
    if (!asignado.activo) return errResponse('inactive_user', 'El usuario asignado está inactivo')
  }

  // Build partial changes object — only include explicitly provided keys.
  // patch_ticket_atomic uses key presence (JSONB ?) to distinguish "not provided" from null.
  const changes: Record<string, unknown> = {}
  if (titulo !== undefined) changes['titulo'] = titulo
  if (descripcion !== undefined) changes['descripcion'] = descripcion
  if (estado !== undefined) changes['estado'] = estado
  if (prioridad !== undefined) changes['prioridad'] = prioridad
  if (asignado_a_id !== undefined) changes['asignado_a_id'] = asignado_a_id ?? null

  // Atomic UPDATE + audit_log INSERT (when estado changes) via PL/pgSQL function.
  // If the INSERT fails the UPDATE rolls back automatically.
  const { data: rpcResult, error: rpcError } = await supabase.rpc('patch_ticket_atomic', {
    p_ticket_id: ticketId,
    p_expected_version: version,
    p_changes: changes,
    p_usuario_id: auth.user.userId,
  })

  if (rpcError) {
    console.error('[supabase error]', rpcError.message)
    return errResponse('validation', 'Error al procesar la solicitud')
  }

  if (rpcResult === 'not_found') return errResponse('not_found', 'Ticket no encontrado')
  if (rpcResult === 'archived') return errResponse('archived', 'El ticket está archivado y es solo lectura')
  if (rpcResult === 'version_conflict') {
    return errResponse('version_conflict', 'Otro usuario modificó este ticket mientras lo editabas. Recarga para ver los cambios.')
  }

  // Update etiquetas if provided (separate operation; not audited in V1)
  if (etiquetas !== undefined) {
    await supabase.from('ticket_etiquetas').delete().eq('ticket_id', ticketId)
    if (etiquetas.length > 0) {
      await upsertEtiquetas(ticketId, etiquetas.map((e) => e.toLowerCase()))
    }
  }

  const ticket = await getTicketOrError(ticketId)
  if (!ticket) return errResponse('not_found', 'Ticket no encontrado')

  return NextResponse.json(formatTicket(ticket))
}
