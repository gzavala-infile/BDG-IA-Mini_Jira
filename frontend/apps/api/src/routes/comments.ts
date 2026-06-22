import { Router, Request, Response } from 'express';
import { comentarios, tickets, usuarios, userPublic, nextComentarioId } from '../lib/db';
import { authenticate } from '../middleware/auth';
import { CommentCreateSchema } from '@mini-jira/shared';

const router = Router({ mergeParams: true });

router.get('/', authenticate, (req: Request, res: Response) => {
  const ticketId = Number(req.params['ticketId']);
  const result = comentarios
    .filter((c) => c.ticket_id === ticketId)
    .sort((a, b) => a.creado_en.getTime() - b.creado_en.getTime())
    .map((c) => ({ ...c, autor: userPublic(usuarios.find((u) => u.id === c.autor_id)!) }));
  res.json(result);
});

router.post('/', authenticate, (req: Request, res: Response) => {
  const parsed = CommentCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'validation', message: parsed.error.flatten() });
    return;
  }

  const ticketId = Number(req.params['ticketId']);
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) { res.status(404).json({ error: 'not_found', message: 'Ticket no encontrado' }); return; }
  if (ticket.archived_at) { res.status(403).json({ error: 'archived', message: 'No se puede comentar en un ticket archivado' }); return; }

  const comentario = {
    id: nextComentarioId(),
    texto: parsed.data.texto,
    creado_en: new Date(),
    ticket_id: ticketId,
    autor_id: req.user!.userId,
  };

  comentarios.push(comentario);
  const autor = usuarios.find((u) => u.id === comentario.autor_id)!;
  res.status(201).json({ ...comentario, autor: userPublic(autor) });
});

router.delete('/:commentId', authenticate, (req: Request, res: Response) => {
  const idx = comentarios.findIndex((c) => c.id === Number(req.params['commentId']));
  if (idx === -1) { res.status(404).json({ error: 'not_found', message: 'Comentario no encontrado' }); return; }

  const comentario = comentarios[idx]!;
  const isAdmin = req.user!.rol === 'admin';
  if (!isAdmin && comentario.autor_id !== req.user!.userId) {
    res.status(403).json({ error: 'forbidden', message: 'Solo puedes borrar tus propios comentarios' });
    return;
  }

  comentarios.splice(idx, 1);
  res.status(204).send();
});

export default router;
