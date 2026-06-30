import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { Ticket, Comentario } from '@mini-jira/shared';
import type { TicketCreateInput, TicketUpdateInput } from '@mini-jira/shared';

export type TicketDetail = Ticket & { comentarios: Comentario[] };

export interface TicketFilters {
  estado?: string[];
  prioridad?: string[];
  asignado_a?: string;
  etiqueta?: string[];
  q?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  archived?: boolean;
}

function buildQS(filters: TicketFilters): string {
  const p = new URLSearchParams();
  filters.estado?.forEach((v) => p.append('estado', v));
  filters.prioridad?.forEach((v) => p.append('prioridad', v));
  if (filters.asignado_a) p.set('asignado_a', filters.asignado_a);
  filters.etiqueta?.forEach((v) => p.append('etiqueta', v));
  if (filters.q) p.set('q', filters.q);
  if (filters.fecha_desde) p.set('fecha_desde', filters.fecha_desde);
  if (filters.fecha_hasta) p.set('fecha_hasta', filters.fecha_hasta);
  if (filters.archived) p.set('archived', 'true');
  const s = p.toString();
  return s ? `?${s}` : '';
}

export function useTickets(filters: TicketFilters = {}) {
  return useQuery({
    queryKey: ['tickets', filters],
    queryFn: () => apiFetch<Ticket[]>(`/tickets${buildQS(filters)}`),
  });
}

export function useTicket(id: number) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: () => apiFetch<TicketDetail>(`/tickets/${id}`),
    enabled: id > 0,
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TicketCreateInput) => apiFetch<Ticket>('/tickets', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  });
}

function applyPatch(ticket: Ticket, patch: TicketUpdateInput): Ticket {
  return {
    ...ticket,
    ...(patch.titulo !== undefined && { titulo: patch.titulo }),
    ...(patch.descripcion !== undefined && { descripcion: patch.descripcion }),
    ...(patch.estado !== undefined && { estado: patch.estado }),
    ...(patch.prioridad !== undefined && { prioridad: patch.prioridad }),
    ...(patch.etiquetas !== undefined && {
      etiquetas: patch.etiquetas.map((nombre, i) => ({ id: -(i + 1), nombre })),
    }),
    version: patch.version,
  };
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TicketUpdateInput }) =>
      apiFetch<Ticket>(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ['tickets'] });
      await qc.cancelQueries({ queryKey: ['ticket', id] });

      const previousLists = qc.getQueriesData<Ticket[]>({ queryKey: ['tickets'] });
      const previousDetail = qc.getQueryData<TicketDetail>(['ticket', id]);

      qc.setQueriesData<Ticket[]>({ queryKey: ['tickets'] }, (old) =>
        old?.map((t) => (t.id === id ? applyPatch(t, data) : t))
      );
      if (previousDetail) {
        qc.setQueryData<TicketDetail>(['ticket', id], { ...previousDetail, ...applyPatch(previousDetail, data) });
      }

      return { previousLists, previousDetail };
    },

    onError: (_err, { id }, context) => {
      context?.previousLists.forEach(([queryKey, data]) => qc.setQueryData(queryKey, data));
      if (context?.previousDetail) {
        qc.setQueryData(['ticket', id], context.previousDetail);
      }
    },

    onSuccess: (ticket) => {
      qc.setQueryData<TicketDetail>(['ticket', ticket.id], (old) =>
        old ? { ...old, ...ticket } : { ...ticket, comentarios: [] }
      );
    },

    onSettled: (_data, _err, { id }) => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['ticket', id] });
    },
  });
}

export function useArchiveTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<Ticket>(`/tickets/${id}/archive`, { method: 'PATCH', body: JSON.stringify({}) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  });
}

export function useRestoreTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<Ticket>(`/tickets/${id}/restore`, { method: 'PATCH', body: JSON.stringify({}) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  });
}
