import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { Usuario } from '@mini-jira/shared';
import type { UserCreateInput, UserUpdateInput } from '@mini-jira/shared';

export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: () => apiFetch<Usuario[]>('/users') });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UserCreateInput) => apiFetch<Usuario>('/users', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserUpdateInput }) =>
      apiFetch<Usuario>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
