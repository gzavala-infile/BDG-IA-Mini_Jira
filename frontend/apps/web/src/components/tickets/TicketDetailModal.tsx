import { useState } from 'react';
import { Archive, RotateCcw } from 'lucide-react';
import { useUiStore } from '@/store/uiStore';
import { useTicket, useArchiveTicket, useRestoreTicket, useUpdateTicket } from '@/api/tickets';
import { useTicketPermissions } from '@/hooks/useTicketPermissions';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TicketStatusBadge } from './TicketStatusBadge';
import { TicketPriorityBadge } from './TicketPriorityBadge';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { CommentList } from '@/components/comments/CommentList';
import { CommentForm } from '@/components/comments/CommentForm';
import { Avatar } from '@/components/ui/avatar';
import { formatDateTime } from '@/lib/utils';
import { Select } from '@/components/ui/select';
import type { EstadoTicket, PrioridadTicket } from '@mini-jira/shared';
import { ESTADO_LABELS, ESTADOS_ORDER, PRIORIDAD_LABELS } from '@/constants';

export function TicketDetailModal() {
  const openTicketId = useUiStore((s) => s.openTicketId);
  const setOpenTicketId = useUiStore((s) => s.setOpenTicketId);
  const addToast = useUiStore((s) => s.addToast);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const { data: ticket } = useTicket(openTicketId ?? 0);
  const perms = useTicketPermissions(ticket ?? null);
  const archiveTicket = useArchiveTicket();
  const restoreTicket = useRestoreTicket();
  const updateTicket = useUpdateTicket();

  async function handleStatusChange(estado: EstadoTicket) {
    if (!ticket) return;
    try {
      await updateTicket.mutateAsync({ id: ticket.id, data: { estado, version: ticket.version } });
    } catch {
      addToast({ title: 'Error al cambiar estado', variant: 'destructive' });
    }
  }

  async function handleArchive() {
    if (!ticket) return;
    await archiveTicket.mutateAsync(ticket.id);
    setConfirmArchive(false);
    setOpenTicketId(null);
  }

  async function handleRestore() {
    if (!ticket) return;
    await restoreTicket.mutateAsync(ticket.id);
    setOpenTicketId(null);
  }

  if (!openTicketId) return null;

  const comments = (ticket as (typeof ticket & { comentarios?: import('@mini-jira/shared').Comentario[] }))?.comentarios ?? [];

  return (
    <Dialog open={!!openTicketId} onOpenChange={(o) => !o && setOpenTicketId(null)}>
      <DialogContent className="max-w-3xl">
        {!ticket ? (
          <p className="text-body-md text-on-surface-variant py-8 text-center">Cargando…</p>
        ) : (
          <div className="flex flex-col gap-4">
            {ticket.archived_at && (
              <div className="bg-surface-container-high rounded px-3 py-2 text-label-lg text-on-surface-variant border border-outline-variant">
                Este ticket está archivado y es de solo lectura.
              </div>
            )}

            <div>
              <h2 className="font-heading text-headline-md text-on-surface">{ticket.titulo}</h2>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <TicketStatusBadge estado={ticket.estado} />
                <TicketPriorityBadge prioridad={ticket.prioridad} />
                {ticket.etiquetas.map((e) => (
                  <span key={e.id} className="rounded-full bg-surface-container px-2 py-0.5 text-label-md text-on-surface-variant">{e.nombre}</span>
                ))}
              </div>
            </div>

            {ticket.descripcion && (
              <div className="border-t border-outline-variant pt-4">
                <MarkdownRenderer content={ticket.descripcion} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-body-md border-t border-outline-variant pt-4">
              <div>
                <p className="text-label-md text-on-surface-variant">Creado por</p>
                <div className="flex items-center gap-2 mt-1">
                  <Avatar nombre={ticket.creado_por.nombre} size="sm" />
                  <span className="text-on-surface">{ticket.creado_por.nombre}</span>
                </div>
              </div>
              <div>
                <p className="text-label-md text-on-surface-variant">Asignado a</p>
                {ticket.asignado_a ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar nombre={ticket.asignado_a.nombre} size="sm" />
                    <span className="text-on-surface">{ticket.asignado_a.nombre}</span>
                    {!ticket.asignado_a.activo && <span className="text-label-md text-on-surface-variant">(inactivo)</span>}
                  </div>
                ) : <span className="text-on-surface-variant">Sin asignar</span>}
              </div>
              <div>
                <p className="text-label-md text-on-surface-variant">Creado</p>
                <p className="text-on-surface">{formatDateTime(ticket.creado_en)}</p>
              </div>
              <div>
                <p className="text-label-md text-on-surface-variant">Actualizado</p>
                <p className="text-on-surface">{formatDateTime(ticket.actualizado_en)}</p>
              </div>
            </div>

            {perms.canChangeStatus && (
              <div className="flex items-center gap-3 border-t border-outline-variant pt-4">
                <label className="text-label-md text-on-surface-variant">Cambiar estado:</label>
                <Select value={ticket.estado} onChange={(e) => handleStatusChange(e.target.value as EstadoTicket)} className="w-48">
                  {ESTADOS_ORDER.map((e) => <option key={e} value={e}>{ESTADO_LABELS[e]}</option>)}
                </Select>
                <label className="text-label-md text-on-surface-variant ml-4">Prioridad:</label>
                <Select
                  value={ticket.prioridad}
                  onChange={(e) => updateTicket.mutate({ id: ticket.id, data: { prioridad: e.target.value as PrioridadTicket, version: ticket.version } })}
                  className="w-36"
                >
                  {(['alta', 'media', 'baja'] as PrioridadTicket[]).map((p) => <option key={p} value={p}>{PRIORIDAD_LABELS[p]}</option>)}
                </Select>
              </div>
            )}

            {(perms.canArchive || (perms.isReadOnly && ticket.archived_at)) && (
              <div className="flex gap-2 border-t border-outline-variant pt-4">
                {perms.canArchive && !confirmArchive && (
                  <Button variant="destructive" size="sm" onClick={() => setConfirmArchive(true)}>
                    <Archive size={14} /> Eliminar
                  </Button>
                )}
                {confirmArchive && (
                  <>
                    <p className="text-body-md text-on-surface mr-2">¿Confirmar archivado?</p>
                    <Button variant="destructive" size="sm" onClick={handleArchive}>Sí, archivar</Button>
                    <Button variant="subtle" size="sm" onClick={() => setConfirmArchive(false)}>Cancelar</Button>
                  </>
                )}
                {ticket.archived_at && (
                  <Button variant="subtle" size="sm" onClick={handleRestore}>
                    <RotateCcw size={14} /> Restaurar
                  </Button>
                )}
              </div>
            )}

            <div className="border-t border-outline-variant pt-4">
              <h3 className="text-title-lg text-on-surface mb-3">Comentarios</h3>
              <CommentList comments={comments} />
              {perms.canComment && <CommentForm ticketId={ticket.id} />}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
