import type { EstadoTicket, PrioridadTicket } from './types';

export const ESTADOS: Record<EstadoTicket, string> = {
  por_hacer: 'Por hacer',
  en_progreso: 'En progreso',
  bloqueado: 'Bloqueado',
  listo: 'Listo',
};

export const ESTADOS_ORDER: EstadoTicket[] = [
  'por_hacer',
  'en_progreso',
  'bloqueado',
  'listo',
];

export const PRIORIDADES: Record<PrioridadTicket, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

export const JWT_ACCESS_EXPIRES = '1h';
export const JWT_REFRESH_EXPIRES = '7d';
