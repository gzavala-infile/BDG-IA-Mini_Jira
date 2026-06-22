// Inlined from frontend/packages/shared — source of truth for domain types and schemas.
// Keep in sync with packages/shared if you update either side.

import { z } from 'zod'

// ── Types ─────────────────────────────────────────────────────────────────────

export type Rol = 'admin' | 'usuario'
export type EstadoTicket = 'por_hacer' | 'en_progreso' | 'bloqueado' | 'listo'
export type PrioridadTicket = 'alta' | 'media' | 'baja'

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: Rol
  activo: boolean
  creado_en: string
  actualizado_en: string
}

export interface Etiqueta {
  id: number
  nombre: string
}

export interface Ticket {
  id: number
  titulo: string
  descripcion: string | null
  estado: EstadoTicket
  prioridad: PrioridadTicket
  version: number
  archived_at: string | null
  creado_en: string
  actualizado_en: string
  creado_por: Usuario
  asignado_a: Usuario | null
  etiquetas: Etiqueta[]
  _count?: { comentarios: number }
}

export interface Comentario {
  id: number
  texto: string
  creado_en: string
  ticket_id: number
  autor: Usuario
}

export interface AuthUser {
  id: string
  nombre: string
  email: string
  rol: Rol
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export interface MetricasMes {
  mes: number
  anio: number
  tickets_creados: number
  tickets_listos: number
  tickets_listos_por_usuario: Array<{ usuario: Usuario; total: number }>
  distribucion_por_estado: Array<{ estado: EstadoTicket; total: number }>
}

export interface ApiError {
  error: string
  message: string
  statusCode: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const ESTADOS: Record<EstadoTicket, string> = {
  por_hacer: 'Por hacer',
  en_progreso: 'En progreso',
  bloqueado: 'Bloqueado',
  listo: 'Listo',
}

export const ESTADOS_ORDER: EstadoTicket[] = [
  'por_hacer',
  'en_progreso',
  'bloqueado',
  'listo',
]

export const PRIORIDADES: Record<PrioridadTicket, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
}

export const JWT_ACCESS_EXPIRES = '1h'
export const JWT_REFRESH_EXPIRES = '7d'

// ── Schemas ───────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

export const TicketCreateSchema = z.object({
  titulo: z.string().min(1, 'El título es requerido').max(120, 'Máximo 120 caracteres'),
  descripcion: z.string().optional().nullable(),
  prioridad: z.enum(['alta', 'media', 'baja']).default('media'),
  asignado_a_id: z.string().uuid().optional().nullable(),
  etiquetas: z.array(z.string().min(1).max(50)).max(5, 'Máximo 5 etiquetas').default([]),
})

export const TicketUpdateSchema = z.object({
  titulo: z.string().min(1).max(120).optional(),
  descripcion: z.string().optional().nullable(),
  prioridad: z.enum(['alta', 'media', 'baja']).optional(),
  estado: z.enum(['por_hacer', 'en_progreso', 'bloqueado', 'listo']).optional(),
  asignado_a_id: z.string().uuid().optional().nullable(),
  etiquetas: z.array(z.string().min(1).max(50)).max(5).optional(),
  version: z.number().int().positive(),
})

export const CommentCreateSchema = z.object({
  texto: z.string().min(1, 'El comentario no puede estar vacío').max(5000),
})

export const UserCreateSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  rol: z.enum(['admin', 'usuario']).default('usuario'),
})

export const UserUpdateSchema = z.object({
  nombre: z.string().min(2).max(100).optional(),
  rol: z.enum(['admin', 'usuario']).optional(),
  activo: z.boolean().optional(),
})

export const TicketLockSchema = z.object({
  ticket_id: z.number().int(),
  locked_by: z.string().uuid(),
  locked_at: z.string(),
  expires_at: z.string(),
})

export const AuditLogEntrySchema = z.object({
  id: z.number().int(),
  ticket_id: z.number().int(),
  usuario_id: z.string().uuid(),
  campo: z.string(),
  valor_anterior: z.string().nullable(),
  valor_nuevo: z.string(),
  creado_en: z.string(),
})

export type LoginInput = z.infer<typeof LoginSchema>
export type TicketCreateInput = z.infer<typeof TicketCreateSchema>
export type TicketUpdateInput = z.infer<typeof TicketUpdateSchema>
export type CommentCreateInput = z.infer<typeof CommentCreateSchema>
export type UserCreateInput = z.infer<typeof UserCreateSchema>
export type UserUpdateInput = z.infer<typeof UserUpdateSchema>
export type TicketLockInput = z.infer<typeof TicketLockSchema>
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>
