import { useTickets, useRestoreTicket } from '@/api/tickets';
import { useAuth } from '@/hooks/useAuth';
import { TicketStatusBadge } from '@/components/tickets/TicketStatusBadge';
import { TicketPriorityBadge } from '@/components/tickets/TicketPriorityBadge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { formatDate } from '@/lib/utils';
import { RotateCcw } from 'lucide-react';

export function ArchivePage() {
  const { data: tickets = [], isLoading } = useTickets({ archived: true });
  const { isAdmin } = useAuth();
  const restore = useRestoreTicket();

  return (
    <div>
      <h1 className="font-heading text-headline-lg text-on-surface mb-6">Tickets Archivados</h1>

      {isLoading && <p className="text-body-md text-on-surface-variant">Cargando…</p>}

      {!isLoading && tickets.length === 0 && (
        <p className="text-body-md text-on-surface-variant py-12 text-center">No hay tickets archivados.</p>
      )}

      {tickets.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low">
                <th className="text-left px-4 py-3 text-label-lg text-on-surface-variant uppercase tracking-wider">Título</th>
                <th className="text-left px-4 py-3 text-label-lg text-on-surface-variant uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-3 text-label-lg text-on-surface-variant uppercase tracking-wider">Prioridad</th>
                <th className="text-left px-4 py-3 text-label-lg text-on-surface-variant uppercase tracking-wider">Asignado</th>
                <th className="text-left px-4 py-3 text-label-lg text-on-surface-variant uppercase tracking-wider">Archivado</th>
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="border-b border-outline-variant last:border-0">
                  <td className="px-4 py-3 text-body-md text-on-surface max-w-xs truncate">{t.titulo}</td>
                  <td className="px-4 py-3"><TicketStatusBadge estado={t.estado} /></td>
                  <td className="px-4 py-3"><TicketPriorityBadge prioridad={t.prioridad} /></td>
                  <td className="px-4 py-3">
                    {t.asignado_a ? (
                      <div className="flex items-center gap-2">
                        <Avatar nombre={t.asignado_a.nombre} size="sm" />
                        <span className="text-body-md text-on-surface">{t.asignado_a.nombre}</span>
                      </div>
                    ) : <span className="text-on-surface-variant">—</span>}
                  </td>
                  <td className="px-4 py-3 text-body-md text-on-surface-variant">{t.archived_at ? formatDate(t.archived_at) : '—'}</td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <Button variant="subtle" size="sm" onClick={() => restore.mutate(t.id)}>
                        <RotateCcw size={12} /> Restaurar
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
