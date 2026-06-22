export type Rol = 'admin' | 'usuario'
export type EstadoTicket = 'por_hacer' | 'en_progreso' | 'bloqueado' | 'listo'
export type PrioridadTicket = 'alta' | 'media' | 'baja'

export interface UsuarioRow {
  id: string
  nombre: string
  email: string
  password_hash: string
  rol: Rol
  activo: boolean
  creado_en: string
  actualizado_en: string
}

export type UsuarioPublico = Omit<UsuarioRow, 'password_hash'>

export interface EtiquetaRow {
  id: number
  nombre: string
}

export interface TicketRow {
  id: number
  titulo: string
  descripcion: string | null
  estado: EstadoTicket
  prioridad: PrioridadTicket
  version: number
  archived_at: string | null
  creado_en: string
  actualizado_en: string
  creado_por_id: string
  asignado_a_id: string | null
}

export interface TicketWithRelations extends TicketRow {
  creado_por: UsuarioPublico | null
  asignado_a: UsuarioPublico | null
  ticket_etiquetas: { etiqueta_id: number; etiquetas: EtiquetaRow }[]
  comentarios: { count: number }[]
}

export interface ComentarioRow {
  id: number
  texto: string
  ticket_id: number
  autor_id: string
  creado_en: string
}

export interface ComentarioWithAutor extends ComentarioRow {
  autor: UsuarioPublico | null
}

export interface TicketLockRow {
  ticket_id: number
  locked_by: string
  locked_at: string
  expires_at: string
}

export interface TicketLockWithUser extends TicketLockRow {
  usuario: UsuarioPublico | null
}

export interface AuditLogRow {
  id: number
  ticket_id: number
  usuario_id: string
  campo: string
  valor_anterior: string | null
  valor_nuevo: string
  creado_en: string
}

export interface AuditLogWithUser extends AuditLogRow {
  usuario: UsuarioPublico | null
}

export interface RefreshTokenRow {
  id: number
  usuario_id: string
  token_hash: string
  revocado: boolean
  expira_en: string
  creado_en: string
}

export function formatTicket(t: TicketWithRelations) {
  return {
    id: t.id,
    titulo: t.titulo,
    descripcion: t.descripcion,
    estado: t.estado,
    prioridad: t.prioridad,
    version: t.version,
    archived_at: t.archived_at,
    creado_en: t.creado_en,
    actualizado_en: t.actualizado_en,
    creado_por: t.creado_por,
    asignado_a: t.asignado_a,
    etiquetas: t.ticket_etiquetas.map((te) => te.etiquetas),
    _count: { comentarios: t.comentarios[0]?.count ?? 0 },
  }
}

// Supabase select string for ticket with all relations (no password_hash)
export const TICKET_SELECT = `
  id, titulo, descripcion, estado, prioridad, version, archived_at, creado_en, actualizado_en, creado_por_id, asignado_a_id,
  creado_por:creado_por_id(id, nombre, email, rol, activo, creado_en, actualizado_en),
  asignado_a:asignado_a_id(id, nombre, email, rol, activo, creado_en, actualizado_en),
  ticket_etiquetas(etiqueta_id, etiquetas(id, nombre)),
  comentarios(count)
`.trim()
