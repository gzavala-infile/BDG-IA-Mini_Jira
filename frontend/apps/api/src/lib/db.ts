import bcrypt from 'bcryptjs';

type RolUsuario = 'admin' | 'usuario';
type EstadoTicket = 'por_hacer' | 'en_progreso' | 'bloqueado' | 'listo';
type PrioridadTicket = 'alta' | 'media' | 'baja';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  password_hash: string;
  rol: RolUsuario;
  activo: boolean;
  creado_en: Date;
  actualizado_en: Date;
}

export interface RefreshToken {
  id: string;
  token: string;
  usuario_id: string;
  expires_at: Date;
  creado_en: Date;
}

export interface Etiqueta {
  id: number;
  nombre: string;
}

export interface Ticket {
  id: number;
  titulo: string;
  descripcion: string | null;
  estado: EstadoTicket;
  prioridad: PrioridadTicket;
  version: number;
  archived_at: Date | null;
  creado_en: Date;
  actualizado_en: Date;
  creado_por_id: string;
  asignado_a_id: string | null;
  etiqueta_ids: number[];
}

export interface Comentario {
  id: number;
  texto: string;
  creado_en: Date;
  ticket_id: number;
  autor_id: string;
}

export type UsuarioPublico = Omit<Usuario, 'password_hash'>;

export function userPublic(u: Usuario): UsuarioPublico {
  const { password_hash: _, ...pub } = u;
  return pub;
}

// ── seed data ──────────────────────────────────────────────────────────────

const now = new Date('2026-01-15T10:00:00Z');

export const usuarios: Usuario[] = [
  {
    id: 'u-admin-001',
    nombre: 'Admin Demo',
    email: 'admin@mini-jira.dev',
    password_hash: bcrypt.hashSync('admin123', 10),
    rol: 'admin',
    activo: true,
    creado_en: now,
    actualizado_en: now,
  },
  {
    id: 'u-ana-002',
    nombre: 'Ana García',
    email: 'ana@mini-jira.dev',
    password_hash: bcrypt.hashSync('pass123', 10),
    rol: 'usuario',
    activo: true,
    creado_en: now,
    actualizado_en: now,
  },
  {
    id: 'u-carlos-003',
    nombre: 'Carlos López',
    email: 'carlos@mini-jira.dev',
    password_hash: bcrypt.hashSync('pass123', 10),
    rol: 'usuario',
    activo: true,
    creado_en: now,
    actualizado_en: now,
  },
  {
    id: 'u-sofia-004',
    nombre: 'Sofía Ruiz',
    email: 'sofia@mini-jira.dev',
    password_hash: bcrypt.hashSync('pass123', 10),
    rol: 'usuario',
    activo: false,
    creado_en: now,
    actualizado_en: now,
  },
];

export const etiquetas: Etiqueta[] = [
  { id: 1, nombre: 'frontend' },
  { id: 2, nombre: 'backend' },
  { id: 3, nombre: 'bug' },
  { id: 4, nombre: 'diseño' },
  { id: 5, nombre: 'auth' },
];

let _etiquetaSeq = etiquetas.length + 1;
export function nextEtiquetaId(): number { return _etiquetaSeq++; }

export const tickets: Ticket[] = [
  {
    id: 1,
    titulo: 'Implementar login con JWT',
    descripcion: 'Crear endpoint POST /api/auth/login que devuelva accessToken y refreshToken.',
    estado: 'listo',
    prioridad: 'alta',
    version: 3,
    archived_at: null,
    creado_en: new Date('2026-02-01T09:00:00Z'),
    actualizado_en: new Date('2026-02-10T14:00:00Z'),
    creado_por_id: 'u-admin-001',
    asignado_a_id: 'u-carlos-003',
    etiqueta_ids: [2, 5],
  },
  {
    id: 2,
    titulo: 'Diseñar tablero Kanban',
    descripcion: 'Crear las columnas Por hacer, En progreso, Bloqueado y Listo con drag & drop.',
    estado: 'en_progreso',
    prioridad: 'alta',
    version: 2,
    archived_at: null,
    creado_en: new Date('2026-02-03T10:00:00Z'),
    actualizado_en: new Date('2026-02-15T09:00:00Z'),
    creado_por_id: 'u-admin-001',
    asignado_a_id: 'u-ana-002',
    etiqueta_ids: [1, 4],
  },
  {
    id: 3,
    titulo: 'Arreglar bug en formulario de ticket',
    descripcion: 'Al guardar un ticket con etiquetas duplicadas, la API devuelve 500.',
    estado: 'por_hacer',
    prioridad: 'alta',
    version: 1,
    archived_at: null,
    creado_en: new Date('2026-02-05T11:30:00Z'),
    actualizado_en: new Date('2026-02-05T11:30:00Z'),
    creado_por_id: 'u-ana-002',
    asignado_a_id: null,
    etiqueta_ids: [3, 2],
  },
  {
    id: 4,
    titulo: 'Configurar CI/CD con GitHub Actions',
    descripcion: 'Pipeline con lint, type-check y tests. Deploy automático a staging en merge a main.',
    estado: 'bloqueado',
    prioridad: 'media',
    version: 1,
    archived_at: null,
    creado_en: new Date('2026-02-06T08:00:00Z'),
    actualizado_en: new Date('2026-02-07T12:00:00Z'),
    creado_por_id: 'u-admin-001',
    asignado_a_id: 'u-carlos-003',
    etiqueta_ids: [],
  },
  {
    id: 5,
    titulo: 'Crear componente de avatar de usuario',
    descripcion: 'Avatar circular con iniciales y colores generados a partir del nombre.',
    estado: 'listo',
    prioridad: 'baja',
    version: 2,
    archived_at: null,
    creado_en: new Date('2026-02-08T14:00:00Z'),
    actualizado_en: new Date('2026-02-12T10:00:00Z'),
    creado_por_id: 'u-ana-002',
    asignado_a_id: 'u-ana-002',
    etiqueta_ids: [1, 4],
  },
  {
    id: 6,
    titulo: 'Endpoint PATCH /tickets/:id con control de versión',
    descripcion: 'Implementar optimistic locking para evitar conflictos de edición simultánea.',
    estado: 'en_progreso',
    prioridad: 'media',
    version: 1,
    archived_at: null,
    creado_en: new Date('2026-02-10T09:00:00Z'),
    actualizado_en: new Date('2026-02-16T11:00:00Z'),
    creado_por_id: 'u-carlos-003',
    asignado_a_id: 'u-carlos-003',
    etiqueta_ids: [2],
  },
  {
    id: 7,
    titulo: 'Página de métricas con gráficas',
    descripcion: 'Dashboard con distribución por estado y tickets listos por usuario usando Recharts.',
    estado: 'por_hacer',
    prioridad: 'media',
    version: 1,
    archived_at: null,
    creado_en: new Date('2026-02-11T10:00:00Z'),
    actualizado_en: new Date('2026-02-11T10:00:00Z'),
    creado_por_id: 'u-admin-001',
    asignado_a_id: 'u-ana-002',
    etiqueta_ids: [1],
  },
  {
    id: 8,
    titulo: 'Setup inicial del monorepo con Turborepo',
    descripcion: 'Configurar workspace de npm, Turborepo y packages/shared.',
    estado: 'listo',
    prioridad: 'alta',
    version: 4,
    archived_at: new Date('2026-02-14T12:00:00Z'),
    creado_en: new Date('2026-01-20T08:00:00Z'),
    actualizado_en: new Date('2026-02-14T12:00:00Z'),
    creado_por_id: 'u-admin-001',
    asignado_a_id: 'u-admin-001',
    etiqueta_ids: [],
  },
];

let _ticketSeq = tickets.length + 1;
export function nextTicketId(): number { return _ticketSeq++; }

export const comentarios: Comentario[] = [
  {
    id: 1,
    texto: 'Ya tengo el endpoint funcionando en local, subo PR mañana.',
    creado_en: new Date('2026-02-09T15:00:00Z'),
    ticket_id: 1,
    autor_id: 'u-carlos-003',
  },
  {
    id: 2,
    texto: 'Perfecto, recuerda agregar el test de refresh token.',
    creado_en: new Date('2026-02-09T16:30:00Z'),
    ticket_id: 1,
    autor_id: 'u-admin-001',
  },
  {
    id: 3,
    texto: 'El diseño está bloqueado porque falta definir los tokens de color definitivos.',
    creado_en: new Date('2026-02-15T09:30:00Z'),
    ticket_id: 2,
    autor_id: 'u-ana-002',
  },
  {
    id: 4,
    texto: 'Reproduje el bug. Ocurre cuando se envían etiquetas con distinto casing (Bug vs bug).',
    creado_en: new Date('2026-02-06T08:00:00Z'),
    ticket_id: 3,
    autor_id: 'u-ana-002',
  },
];

let _comentarioSeq = comentarios.length + 1;
export function nextComentarioId(): number { return _comentarioSeq++; }

export const refreshTokens: RefreshToken[] = [];

// ── helper: format ticket for API response ─────────────────────────────────

export function formatTicket(ticket: Ticket, includeComments?: Comentario[]) {
  const creado_por = usuarios.find((u) => u.id === ticket.creado_por_id)!;
  const asignado_a = ticket.asignado_a_id ? (usuarios.find((u) => u.id === ticket.asignado_a_id) ?? null) : null;
  const etiquetasData = etiquetas.filter((e) => ticket.etiqueta_ids.includes(e.id));
  const comentariosCount = comentarios.filter((c) => c.ticket_id === ticket.id).length;

  const base = {
    id: ticket.id,
    titulo: ticket.titulo,
    descripcion: ticket.descripcion,
    estado: ticket.estado,
    prioridad: ticket.prioridad,
    version: ticket.version,
    archived_at: ticket.archived_at,
    creado_en: ticket.creado_en,
    actualizado_en: ticket.actualizado_en,
    creado_por: creado_por ? userPublic(creado_por) : null,
    asignado_a: asignado_a ? userPublic(asignado_a) : null,
    etiquetas: etiquetasData,
    _count: { comentarios: comentariosCount },
  };

  if (includeComments !== undefined) {
    return {
      ...base,
      comentarios: includeComments.map((c) => ({
        ...c,
        autor: userPublic(usuarios.find((u) => u.id === c.autor_id)!),
      })),
    };
  }

  return base;
}
