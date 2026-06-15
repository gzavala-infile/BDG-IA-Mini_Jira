import { Router, Request, Response } from 'express';
import { tickets, etiquetas, usuarios, comentarios, formatTicket, nextTicketId, nextEtiquetaId } from '../lib/db';
import { authenticate } from '../middleware/auth';
import { TicketCreateSchema, TicketUpdateSchema, ESTADOS } from '@mini-jira/shared';

const router = Router();

function findOrCreateEtiqueta(nombre: string) {
  const lower = nombre.toLowerCase();
  const existing = etiquetas.find((e) => e.nombre === lower);
  if (existing) return existing;
  const created = { id: nextEtiquetaId(), nombre: lower };
  etiquetas.push(created);
  return created;
}

router.get('/', authenticate, (req: Request, res: Response) => {
  const { estado, prioridad, asignado_a, etiqueta, q, fecha_desde, fecha_hasta, archived } = req.query as Record<string, string | string[] | undefined>;
  const isArchived = archived === 'true';

  let result = tickets.filter((t) => (isArchived ? t.archived_at !== null : t.archived_at === null));

  if (estado) {
    const estados = Array.isArray(estado) ? estado : [estado];
    result = result.filter((t) => estados.includes(t.estado));
  }
  if (prioridad) {
    const prioridades = Array.isArray(prioridad) ? prioridad : [prioridad];
    result = result.filter((t) => prioridades.includes(t.prioridad));
  }
  if (asignado_a) {
    result = result.filter((t) => t.asignado_a_id === asignado_a);
  }
  if (etiqueta) {
    const nombres = Array.isArray(etiqueta) ? etiqueta : [etiqueta];
    const ids = etiquetas.filter((e) => nombres.includes(e.nombre)).map((e) => e.id);
    result = result.filter((t) => ids.some((id) => t.etiqueta_ids.includes(id)));
  }
  if (q) {
    const lower = (q as string).toLowerCase();
    result = result.filter((t) => t.titulo.toLowerCase().includes(lower) || (t.descripcion ?? '').toLowerCase().includes(lower));
  }
  if (fecha_desde) {
    const desde = new Date(fecha_desde as string);
    result = result.filter((t) => t.creado_en >= desde);
  }
  if (fecha_hasta) {
    const hasta = new Date(fecha_hasta as string);
    result = result.filter((t) => t.creado_en <= hasta);
  }

  result.sort((a, b) => b.creado_en.getTime() - a.creado_en.getTime());
  res.json(result.map((t) => formatTicket(t)));
});

router.post('/', authenticate, (req: Request, res: Response) => {
  const parsed = TicketCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'validation', message: parsed.error.flatten() });
    return;
  }

  const { titulo, descripcion, prioridad, asignado_a_id, etiquetas: etiquetasNombres } = parsed.data;

  if (asignado_a_id) {
    const asignado = usuarios.find((u) => u.id === asignado_a_id);
    if (!asignado || !asignado.activo) {
      res.status(422).json({ error: 'inactive_user', message: 'El usuario asignado está desactivado' });
      return;
    }
  }

  const etiquetasCreadas = etiquetasNombres.map(findOrCreateEtiqueta);

  const ticket = {
    id: nextTicketId(),
    titulo,
    descripcion: descripcion ?? null,
    estado: 'por_hacer' as const,
    prioridad: prioridad ?? 'media',
    version: 1,
    archived_at: null,
    creado_en: new Date(),
    actualizado_en: new Date(),
    creado_por_id: req.user!.userId,
    asignado_a_id: asignado_a_id ?? null,
    etiqueta_ids: etiquetasCreadas.map((e) => e.id),
  };

  tickets.push(ticket);
  res.status(201).json(formatTicket(ticket));
});

router.get('/:id', authenticate, (req: Request, res: Response) => {
  const ticket = tickets.find((t) => t.id === Number(req.params['id']));
  if (!ticket) { res.status(404).json({ error: 'not_found', message: 'Ticket no encontrado' }); return; }

  const ticketComentarios = comentarios
    .filter((c) => c.ticket_id === ticket.id)
    .sort((a, b) => a.creado_en.getTime() - b.creado_en.getTime());

  res.json(formatTicket(ticket, ticketComentarios));
});

router.patch('/:id', authenticate, (req: Request, res: Response) => {
  const parsed = TicketUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'validation', message: parsed.error.flatten() });
    return;
  }

  const { version, etiquetas: etiquetasNombres, ...data } = parsed.data;
  const ticketId = Number(req.params['id']);
  const userId = req.user!.userId;
  const isAdmin = req.user!.rol === 'admin';

  const idx = tickets.findIndex((t) => t.id === ticketId);
  if (idx === -1) { res.status(404).json({ error: 'not_found', message: 'Ticket no encontrado' }); return; }

  const current = tickets[idx]!;
  if (current.archived_at) { res.status(409).json({ error: 'archived', message: 'Este ticket fue archivado y es de solo lectura' }); return; }
  if (!isAdmin && current.creado_por_id !== userId) { res.status(403).json({ error: 'forbidden', message: 'Sin permiso para editar este ticket' }); return; }
  if (data.asignado_a_id !== undefined && !isAdmin) { res.status(403).json({ error: 'forbidden', message: 'Solo Admin puede reasignar tickets' }); return; }

  if (data.asignado_a_id) {
    const asignado = usuarios.find((u) => u.id === data.asignado_a_id);
    if (!asignado || !asignado.activo) { res.status(422).json({ error: 'inactive_user', message: 'El usuario asignado está desactivado' }); return; }
  }

  if (current.version !== version) {
    res.status(409).json({ error: 'version_conflict', message: 'Otro usuario modificó este ticket mientras lo editabas. Recarga para ver los cambios.' });
    return;
  }

  const updated = {
    ...current,
    ...(data.titulo !== undefined && { titulo: data.titulo }),
    ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
    ...(data.estado !== undefined && { estado: data.estado }),
    ...(data.prioridad !== undefined && { prioridad: data.prioridad }),
    ...(data.asignado_a_id !== undefined && { asignado_a_id: data.asignado_a_id }),
    version: current.version + 1,
    actualizado_en: new Date(),
  };

  if (etiquetasNombres !== undefined) {
    updated.etiqueta_ids = etiquetasNombres.map(findOrCreateEtiqueta).map((e) => e.id);
  }

  tickets[idx] = updated;

  if (data.estado && current.asignado_a_id) {
    // email notification skipped in mock mode
    void ESTADOS;
  }

  res.json(formatTicket(updated));
});

router.patch('/:id/archive', authenticate, (req: Request, res: Response) => {
  const ticketId = Number(req.params['id']);
  const userId = req.user!.userId;
  const isAdmin = req.user!.rol === 'admin';

  const idx = tickets.findIndex((t) => t.id === ticketId);
  if (idx === -1) { res.status(404).json({ error: 'not_found', message: 'Ticket no encontrado' }); return; }

  const current = tickets[idx]!;
  if (!isAdmin && current.creado_por_id !== userId) { res.status(403).json({ error: 'forbidden', message: 'Sin permiso para archivar este ticket' }); return; }

  tickets[idx] = { ...current, archived_at: new Date(), actualizado_en: new Date() };
  res.json(formatTicket(tickets[idx]!));
});

router.patch('/:id/restore', authenticate, (req: Request, res: Response) => {
  if (req.user!.rol !== 'admin') { res.status(403).json({ error: 'forbidden', message: 'Solo Admin puede restaurar tickets archivados' }); return; }

  const idx = tickets.findIndex((t) => t.id === Number(req.params['id']));
  if (idx === -1) { res.status(404).json({ error: 'not_found', message: 'Ticket no encontrado' }); return; }

  tickets[idx] = { ...tickets[idx]!, archived_at: null, actualizado_en: new Date() };
  res.json(formatTicket(tickets[idx]!));
});

export default router;
