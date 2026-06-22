import type { EstadoTicket, PrioridadTicket } from '@mini-jira/shared';

export const ESTADO_LABELS: Record<EstadoTicket, string> = {
  por_hacer: 'Por hacer',
  en_progreso: 'En progreso',
  bloqueado: 'Bloqueado',
  listo: 'Listo',
};

export const ESTADO_COLORS: Record<EstadoTicket, string> = {
  por_hacer: 'bg-surface-container-highest text-on-surface-variant',
  en_progreso: 'bg-surface-container-high text-primary',
  bloqueado: 'bg-secondary-container text-on-secondary-container',
  listo: 'bg-tertiary-container text-on-tertiary-container',
};

export const ESTADO_HEADER_COLORS: Record<EstadoTicket, string> = {
  por_hacer: 'text-on-surface-variant',
  en_progreso: 'text-primary',
  bloqueado: 'text-secondary',
  listo: 'text-tertiary',
};

export const PRIORIDAD_LABELS: Record<PrioridadTicket, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

export const PRIORIDAD_COLORS: Record<PrioridadTicket, string> = {
  alta: 'bg-error-container text-on-error-container',
  media: 'bg-secondary-container text-on-secondary-container',
  baja: 'bg-tertiary-container text-on-tertiary-container',
};

export const ESTADOS_ORDER: EstadoTicket[] = ['por_hacer', 'en_progreso', 'bloqueado', 'listo'];
