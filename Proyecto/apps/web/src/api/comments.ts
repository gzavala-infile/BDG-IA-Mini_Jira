import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { Comentario } from '@mini-jira/shared';
import type { CommentCreateInput } from '@mini-jira/shared';

export function useCreateComment(ticketId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CommentCreateInput) =>
      apiFetch<Comentario>(`/tickets/${ticketId}/comments`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket', ticketId] }),
  });
}

export function useDeleteComment(ticketId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: number) =>
      apiFetch<void>(`/tickets/${ticketId}/comments/${commentId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket', ticketId] }),
  });
}
