import { Trash2 } from 'lucide-react';
import type { Comentario } from '@mini-jira/shared';
import { useAuth } from '@/hooks/useAuth';
import { useDeleteComment } from '@/api/comments';
import { formatDateTime } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';

export function CommentItem({ comment }: { comment: Comentario }) {
  const { user, isAdmin } = useAuth();
  const deleteComment = useDeleteComment(comment.ticket_id);
  const canDelete = isAdmin || comment.autor.id === user?.id;

  return (
    <div className="flex gap-3">
      <Avatar nombre={comment.autor.nombre} size="sm" className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-title-md text-on-surface">{comment.autor.nombre}</span>
            <span className="text-label-md text-on-surface-variant ml-2">{formatDateTime(comment.creado_en)}</span>
          </div>
          {canDelete && (
            <button
              onClick={() => deleteComment.mutate(comment.id)}
              className="text-on-surface-variant hover:text-error transition-colors"
              title="Borrar comentario"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
        <p className="text-body-md text-on-surface mt-1 break-words">{comment.texto}</p>
      </div>
    </div>
  );
}
