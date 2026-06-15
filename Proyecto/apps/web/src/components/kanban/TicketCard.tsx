import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MessageSquare } from 'lucide-react';
import type { Ticket } from '@mini-jira/shared';
import { TicketPriorityBadge } from '@/components/tickets/TicketPriorityBadge';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/uiStore';

interface Props {
  ticket: Ticket;
  overlay?: boolean;
}

export function TicketCard({ ticket, overlay = false }: Props) {
  const setOpenTicketId = useUiStore((s) => s.setOpenTicketId);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ticket.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => setOpenTicketId(ticket.id)}
      className={cn(
        'bg-surface-container-lowest border border-outline-variant rounded p-4 cursor-pointer',
        'shadow-card hover:shadow-card-drag transition-shadow select-none',
        isDragging && 'opacity-40',
        overlay && 'rotate-1 shadow-card-drag',
      )}
    >
      <p className="text-title-md text-on-surface line-clamp-2 mb-3">{ticket.titulo}</p>

      {ticket.etiquetas.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {ticket.etiquetas.slice(0, 3).map((e) => (
            <span key={e.id} className="rounded-full bg-surface-container px-2 py-0.5 text-label-md text-on-surface-variant">
              {e.nombre}
            </span>
          ))}
          {ticket.etiquetas.length > 3 && (
            <span className="text-label-md text-on-surface-variant">+{ticket.etiquetas.length - 3}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <TicketPriorityBadge prioridad={ticket.prioridad} />
        <div className="flex items-center gap-2">
          {(ticket._count?.comentarios ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-label-md text-on-surface-variant">
              <MessageSquare size={12} /> {ticket._count?.comentarios}
            </span>
          )}
          {ticket.asignado_a && (
            <Avatar nombre={ticket.asignado_a.nombre} size="sm" />
          )}
        </div>
      </div>

      {ticket.asignado_a && !ticket.asignado_a.activo && (
        <p className="text-label-md text-on-surface-variant mt-1 line-through">(inactivo)</p>
      )}
    </div>
  );
}
