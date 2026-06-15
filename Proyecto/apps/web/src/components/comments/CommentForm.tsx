import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CommentCreateSchema, type CommentCreateInput } from '@mini-jira/shared';
import { useCreateComment } from '@/api/comments';
import { Button } from '@/components/ui/button';

export function CommentForm({ ticketId }: { ticketId: number }) {
  const createComment = useCreateComment(ticketId);
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<CommentCreateInput>({
    resolver: zodResolver(CommentCreateSchema),
  });

  async function onSubmit(data: CommentCreateInput) {
    await createComment.mutateAsync(data);
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2 mt-4">
      <textarea
        {...register('texto')}
        rows={3}
        placeholder="Escribe un comentario…"
        className="w-full rounded border-2 border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant focus:border-primary-container focus:outline-none resize-none"
      />
      {errors.texto && <p className="text-label-md text-error">{errors.texto.message}</p>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isSubmitting}>{isSubmitting ? 'Enviando…' : 'Comentar'}</Button>
      </div>
    </form>
  );
}
