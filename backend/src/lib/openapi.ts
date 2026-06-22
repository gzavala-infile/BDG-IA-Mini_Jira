import { OpenAPIRegistry, OpenApiGeneratorV3, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

extendZodWithOpenApi(z)

export const registry = new OpenAPIRegistry()

// ── Shared schemas ────────────────────────────────────────────────────────────

const UsuarioSchema = registry.register(
  'Usuario',
  z.object({
    id: z.string().uuid(),
    nombre: z.string(),
    email: z.string().email(),
    rol: z.enum(['admin', 'usuario']),
    activo: z.boolean(),
    creado_en: z.string(),
    actualizado_en: z.string(),
  }).openapi('Usuario'),
)

const EtiquetaSchema = registry.register(
  'Etiqueta',
  z.object({
    id: z.number().int(),
    nombre: z.string(),
  }).openapi('Etiqueta'),
)

const TicketSchema = registry.register(
  'Ticket',
  z.object({
    id: z.number().int(),
    titulo: z.string(),
    descripcion: z.string().nullable(),
    estado: z.enum(['por_hacer', 'en_progreso', 'bloqueado', 'listo']),
    prioridad: z.enum(['alta', 'media', 'baja']),
    version: z.number().int(),
    archived_at: z.string().nullable(),
    creado_en: z.string(),
    actualizado_en: z.string(),
    creado_por: UsuarioSchema,
    asignado_a: UsuarioSchema.nullable(),
    etiquetas: z.array(EtiquetaSchema),
    _count: z.object({ comentarios: z.number().int() }),
  }).openapi('Ticket'),
)

const ComentarioSchema = registry.register(
  'Comentario',
  z.object({
    id: z.number().int(),
    texto: z.string(),
    creado_en: z.string(),
    ticket_id: z.number().int(),
    autor: UsuarioSchema,
  }).openapi('Comentario'),
)

const ErrorSchema = registry.register(
  'ApiError',
  z.object({
    error: z.string().openapi({ example: 'not_found' }),
    message: z.unknown().openapi({ example: 'Recurso no encontrado' }),
  }).openapi('ApiError'),
)

// ── Auth schemas ──────────────────────────────────────────────────────────────

const LoginBodySchema = z.object({
  email: z.string().email().openapi({ example: 'admin@mini-jira.dev' }),
  password: z.string().min(1).openapi({ example: 'admin123' }),
}).openapi('LoginBody')

const LoginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string().uuid(),
    nombre: z.string(),
    email: z.string().email(),
    rol: z.enum(['admin', 'usuario']),
  }),
}).openapi('LoginResponse')

const RefreshBodySchema = z.object({
  refreshToken: z.string(),
}).openapi('RefreshBody')

const RefreshResponseSchema = z.object({
  accessToken: z.string(),
}).openapi('RefreshResponse')

const LogoutBodySchema = z.object({
  refreshToken: z.string().optional(),
}).openapi('LogoutBody')

// ── Ticket schemas ────────────────────────────────────────────────────────────

const TicketCreateBodySchema = z.object({
  titulo: z.string().min(1).max(120).openapi({ example: 'Arreglar bug en login' }),
  descripcion: z.string().nullable().optional(),
  prioridad: z.enum(['alta', 'media', 'baja']).default('media').optional(),
  asignado_a_id: z.string().uuid().nullable().optional(),
  etiquetas: z.array(z.string().min(1).max(50)).max(5).default([]).optional(),
}).openapi('TicketCreateBody')

const TicketUpdateBodySchema = z.object({
  version: z.number().int().positive().openapi({ description: 'Versión actual del ticket (optimistic lock)' }),
  titulo: z.string().min(1).max(120).optional(),
  descripcion: z.string().nullable().optional(),
  estado: z.enum(['por_hacer', 'en_progreso', 'bloqueado', 'listo']).optional(),
  prioridad: z.enum(['alta', 'media', 'baja']).optional(),
  asignado_a_id: z.string().uuid().nullable().optional(),
  etiquetas: z.array(z.string().min(1).max(50)).max(5).optional(),
}).openapi('TicketUpdateBody')

const TicketWithComentariosSchema = TicketSchema.extend({
  comentarios: z.array(ComentarioSchema),
}).openapi('TicketWithComentarios')

// ── Path registrations ────────────────────────────────────────────────────────

const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
})

const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: ErrorSchema } },
})

registry.registerPath({
  method: 'get',
  path: '/api/health',
  tags: ['Health'],
  summary: 'Health check',
  responses: {
    200: {
      description: 'OK',
      content: { 'application/json': { schema: z.object({ ok: z.literal(true) }) } },
    },
  },
})

registry.registerPath({
  method: 'post',
  path: '/api/auth/login',
  tags: ['Auth'],
  summary: 'Autenticar usuario',
  request: { body: { content: { 'application/json': { schema: LoginBodySchema } } } },
  responses: {
    200: { description: 'Tokens emitidos', content: { 'application/json': { schema: LoginResponseSchema } } },
    400: errorResponse('Body inválido'),
    401: errorResponse('Credenciales incorrectas'),
  },
})

registry.registerPath({
  method: 'post',
  path: '/api/auth/refresh',
  tags: ['Auth'],
  summary: 'Renovar access token',
  request: { body: { content: { 'application/json': { schema: RefreshBodySchema } } } },
  responses: {
    200: { description: 'Nuevo access token', content: { 'application/json': { schema: RefreshResponseSchema } } },
    401: errorResponse('Refresh token inválido o expirado'),
  },
})

registry.registerPath({
  method: 'post',
  path: '/api/auth/logout',
  tags: ['Auth'],
  summary: 'Cerrar sesión',
  security: [{ [bearerAuth.name]: [] }],
  request: { body: { content: { 'application/json': { schema: LogoutBodySchema } } } },
  responses: {
    204: { description: 'Sesión cerrada' },
    401: errorResponse('No autenticado'),
  },
})

registry.registerPath({
  method: 'get',
  path: '/api/tickets',
  tags: ['Tickets'],
  summary: 'Listar tickets',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    query: z.object({
      estado: z.array(z.enum(['por_hacer', 'en_progreso', 'bloqueado', 'listo'])).optional(),
      prioridad: z.array(z.enum(['alta', 'media', 'baja'])).optional(),
      asignado_a: z.string().uuid().optional(),
      etiqueta: z.array(z.string()).optional(),
      q: z.string().optional(),
      fecha_desde: z.string().optional(),
      fecha_hasta: z.string().optional(),
      archived: z.literal('true').optional(),
    }),
  },
  responses: {
    200: { description: 'Lista de tickets', content: { 'application/json': { schema: z.array(TicketSchema) } } },
    401: errorResponse('No autenticado'),
  },
})

registry.registerPath({
  method: 'post',
  path: '/api/tickets',
  tags: ['Tickets'],
  summary: 'Crear ticket',
  security: [{ [bearerAuth.name]: [] }],
  request: { body: { content: { 'application/json': { schema: TicketCreateBodySchema } } } },
  responses: {
    201: { description: 'Ticket creado', content: { 'application/json': { schema: TicketSchema } } },
    400: errorResponse('Body inválido'),
    401: errorResponse('No autenticado'),
    422: errorResponse('Usuario asignado inactivo'),
  },
})

registry.registerPath({
  method: 'get',
  path: '/api/tickets/{id}',
  tags: ['Tickets'],
  summary: 'Obtener ticket por ID',
  security: [{ [bearerAuth.name]: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Ticket con comentarios', content: { 'application/json': { schema: TicketWithComentariosSchema } } },
    401: errorResponse('No autenticado'),
    404: errorResponse('Ticket no encontrado'),
  },
})

registry.registerPath({
  method: 'patch',
  path: '/api/tickets/{id}',
  tags: ['Tickets'],
  summary: 'Actualizar ticket (optimistic lock)',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { 'application/json': { schema: TicketUpdateBodySchema } } },
  },
  responses: {
    200: { description: 'Ticket actualizado', content: { 'application/json': { schema: TicketSchema } } },
    400: errorResponse('Body inválido'),
    401: errorResponse('No autenticado'),
    403: errorResponse('Sin permiso / ticket archivado'),
    404: errorResponse('Ticket no encontrado'),
    409: errorResponse('Conflicto de versión'),
    422: errorResponse('Usuario asignado inactivo'),
  },
})

registry.registerPath({
  method: 'patch',
  path: '/api/tickets/{id}/archive',
  tags: ['Tickets'],
  summary: 'Archivar ticket',
  security: [{ [bearerAuth.name]: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Ticket archivado', content: { 'application/json': { schema: TicketSchema } } },
    401: errorResponse('No autenticado'),
    403: errorResponse('Sin permiso'),
    404: errorResponse('Ticket no encontrado'),
  },
})

// ── Lock schemas ─────────────────────────────────────────────────────────────

const TicketLockResponseSchema = z.object({
  ticket_id: z.number().int().openapi({ example: 42 }),
  locked_by: UsuarioSchema.nullable(),
  locked_at: z.string().openapi({ example: '2026-06-17T10:00:00Z' }),
  expires_at: z.string().openapi({ example: '2026-06-17T10:05:00Z' }),
}).openapi('TicketLockResponse')

const AuditLogEntrySchema = z.object({
  id: z.number().int(),
  ticket_id: z.number().int(),
  campo: z.string().openapi({ example: 'estado' }),
  valor_anterior: z.string().nullable().openapi({ example: 'por_hacer' }),
  valor_nuevo: z.string().openapi({ example: 'en_progreso' }),
  creado_en: z.string(),
  usuario: UsuarioSchema.nullable(),
}).openapi('AuditLogEntry')

// ── Lock paths ────────────────────────────────────────────────────────────────

registry.registerPath({
  method: 'post',
  path: '/api/tickets/{id}/lock',
  tags: ['Locks'],
  summary: 'Adquirir o renovar lock en un ticket',
  description:
    'Crea un lock de 5 minutos. Si el mismo usuario ya tiene el lock, lo renueva. ' +
    'Si otro usuario tiene un lock activo, devuelve 409 con datos del bloqueador.',
  security: [{ [bearerAuth.name]: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Lock renovado', content: { 'application/json': { schema: TicketLockResponseSchema } } },
    201: { description: 'Lock creado', content: { 'application/json': { schema: TicketLockResponseSchema } } },
    401: errorResponse('No autenticado'),
    403: errorResponse('Ticket archivado'),
    404: errorResponse('Ticket no encontrado'),
    409: errorResponse('Lock activo por otro usuario — body incluye datos del bloqueador'),
  },
})

registry.registerPath({
  method: 'delete',
  path: '/api/tickets/{id}/lock',
  tags: ['Locks'],
  summary: 'Liberar lock de un ticket',
  description: 'Solo el titular del lock o un Admin puede liberar un lock activo. Idempotente (204 si no existe).',
  security: [{ [bearerAuth.name]: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    204: { description: 'Lock liberado (o no existía)' },
    401: errorResponse('No autenticado'),
    403: errorResponse('Sin permiso para liberar este lock'),
    404: errorResponse('Ticket no encontrado'),
  },
})

// ── Audit paths ───────────────────────────────────────────────────────────────

registry.registerPath({
  method: 'get',
  path: '/api/audit/{ticketId}',
  tags: ['Audit'],
  summary: 'Historial de cambios de un ticket',
  description: 'Devuelve las entradas del audit_log para el ticket, ordenadas por fecha ASC. Solo lectura.',
  security: [{ [bearerAuth.name]: [] }],
  request: { params: z.object({ ticketId: z.string() }) },
  responses: {
    200: {
      description: 'Lista de entradas de auditoría',
      content: { 'application/json': { schema: z.array(AuditLogEntrySchema) } },
    },
    401: errorResponse('No autenticado'),
    404: errorResponse('Ticket no encontrado'),
  },
})

// ── Generator ─────────────────────────────────────────────────────────────────

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions)
  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'Mini Jira API',
      version: '1.0.0',
      description: 'API contract para Mini Jira v1.0 — ver backend/api-contract.md',
    },
    servers: [{ url: process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001' }],
  })
}
