export type Rol = 'admin' | 'usuario';
export type EstadoTicket = 'por_hacer' | 'en_progreso' | 'bloqueado' | 'listo';
export type PrioridadTicket = 'alta' | 'media' | 'baja';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
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
  archived_at: string | null;
  creado_en: string;
  actualizado_en: string;
  creado_por: Usuario;
  asignado_a: Usuario | null;
  etiquetas: Etiqueta[];
  _count?: { comentarios: number };
}

export interface Comentario {
  id: number;
  texto: string;
  creado_en: string;
  ticket_id: number;
  autor: Usuario;
}

export interface AuthUser {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface MetricasMes {
  mes: number;
  anio: number;
  tickets_creados: number;
  tickets_listos: number;
  tickets_listos_por_usuario: Array<{ usuario: Usuario; total: number }>;
  distribucion_por_estado: Array<{ estado: EstadoTicket; total: number }>;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}
