import type { Comentario } from '@mini-jira/shared';
import { CommentItem } from './CommentItem';

export function CommentList({ comments }: { comments: Comentario[] }) {
  if (comments.length === 0) {
    return <p className="text-body-md text-on-surface-variant py-4">Sin comentarios aún.</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      {comments.map((c) => <CommentItem key={c.id} comment={c} />)}
    </div>
  );
}
