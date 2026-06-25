import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { errResponse } from '@/lib/errors'
import { getAuth } from '@/lib/auth-guard'
import { TicketCreateSchema } from '@/lib/shared'
import { formatTicket, TICKET_SELECT, type TicketWithRelations, type UsuarioRow } from '@/lib/db.types'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = getAuth(req)
  if (!auth.ok) return errResponse('unauthorized', 'Token inválido o ausente')

  const { searchParams } = new URL(req.url)
  const archived = searchParams.get('archived') === 'true'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = supabase.from('tickets').select(TICKET_SELECT).order('creado_en', { ascending: false }) as any

  query = archived ? query.not('archived_at', 'is', null) : query.is('archived_at', null)

  const estados = searchParams.getAll('estado')
  if (estados.length > 0) query = query.in('estado', estados)

  const prioridades = searchParams.getAll('prioridad')
  if (prioridades.length > 0) query = query.in('prioridad', prioridades)

  const asignado_a = searchParams.get('asignado_a')
  if (asignado_a) query = query.eq('asignado_a_id', asignado_a)

  const fechaDesde = searchParams.get('fecha_desde')
  if (fechaDesde) query = query.gte('creado_en', fechaDesde)

  const fechaHasta = searchParams.get('fecha_hasta')
  if (fechaHasta) query = query.lte('creado_en', fechaHasta)

  const q = searchParams.get('q')
  if (q) {
    const safe = q.replace(/[%_]/g, '\\$&')
    query = query.or(`titulo.ilike.%${safe}%,descripcion.ilike.%${safe}%`)
  }

  const { data, error } = await query
  if (error) {
    console.error('[supabase error]', error.message)
    return errResponse('validation', 'Error al procesar la solicitud')
  }

  let rows = (data ?? []) as TicketWithRelations[]

  // Filtrado por etiqueta en memoria (PostgREST no soporta filtrado sobre nested arrays fácilmente)
  const etiquetas = searchParams.getAll('etiqueta')
  if (etiquetas.length > 0) {
    rows = rows.filter((t) => {
      const nombres = t.ticket_etiquetas.map((te) => te.etiquetas.nombre)
      return etiquetas.every((e) => nombres.includes(e))
    })
  }

  return NextResponse.json(rows.map(formatTicket))
}

export async function POST(req: NextRequest) {
  const auth = getAuth(req)
  if (!auth.ok) return errResponse('unauthorized', 'Token inválido o ausente')

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return errResponse('validation', 'Body JSON inválido')
  }

  const parsed = TicketCreateSchema.safeParse(body)
  if (!parsed.success) {
    return errResponse('validation', parsed.error.flatten().fieldErrors)
  }

  const { titulo, descripcion, prioridad, asignado_a_id, etiquetas } = parsed.data

  // Validar usuario asignado
  if (asignado_a_id) {
    const { data: asignado } = await supabase
      .from('usuarios')
      .select('id, activo')
      .eq('id', asignado_a_id)
      .single<Pick<UsuarioRow, 'id' | 'activo'>>()

    if (!asignado) return errResponse('not_found', 'Usuario asignado no existe')
    if (!asignado.activo) return errResponse('inactive_user', 'El usuario asignado está inactivo')
  }

  // Insertar ticket
  const { data: newTicket, error: insertErr } = await supabase
    .from('tickets')
    .insert({
      titulo,
      descripcion: descripcion ?? null,
      prioridad: prioridad ?? 'media',
      estado: 'por_hacer',
      version: 1,
      creado_por_id: auth.user.userId,
      asignado_a_id: asignado_a_id ?? null,
    })
    .select('id')
    .single<{ id: number }>()

  if (insertErr || !newTicket) {
    if (insertErr) console.error('[supabase error]', insertErr.message)
    return errResponse('validation', 'Error al crear ticket')
  }

  // Manejar etiquetas
  if (etiquetas && etiquetas.length > 0) {
    const normalizedEtiquetas = etiquetas.map((e) => e.toLowerCase())
    await upsertEtiquetas(newTicket.id, normalizedEtiquetas)
  }

  // Devolver ticket completo
  const { data: ticket } = await supabase
    .from('tickets')
    .select(TICKET_SELECT)
    .eq('id', newTicket.id)
    .single<TicketWithRelations>()

  if (!ticket) return errResponse('not_found', 'Ticket no encontrado tras creación')

  return NextResponse.json(formatTicket(ticket), { status: 201 })
}

async function upsertEtiquetas(ticketId: number, nombres: string[]) {
  // Upsert etiquetas en catálogo
  const { data: rows } = await supabase
    .from('etiquetas')
    .upsert(nombres.map((nombre) => ({ nombre })), { onConflict: 'nombre' })
    .select('id, nombre')

  if (!rows) return

  // Asociar al ticket
  await supabase.from('ticket_etiquetas').insert(
    rows.map((e: { id: number }) => ({ ticket_id: ticketId, etiqueta_id: e.id })),
  )
}

export { upsertEtiquetas }
