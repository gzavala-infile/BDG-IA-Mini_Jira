import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import type { EstadoTicket, Ticket } from '@mini-jira/shared';
import { ESTADO_LABELS, ESTADO_HEADER_COLORS } from '@/constants';
import { TicketCard } from './TicketCard';
import { cn } from '@/lib/utils';

interface Props {
  estado: EstadoTicket;
  tickets: Ticket[];
  onAddTicket?: () => void;
}

export function KanbanColumn({ estado, tickets, onAddTicket }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: estado });

  return (
    <div className="kanban-column-width flex flex-col shrink-0">
      <div className="flex items-center justify-between mb-3">
        <span className={cn('text-label-lg uppercase tracking-wider', ESTADO_HEADER_COLORS[estado])}>
          {ESTADO_LABELS[estado]}
        </span>
        <span className="text-label-lg text-on-surface-variant bg-surface-container rounded-full w-5 h-5 flex items-center justify-center">
          {tickets.length}
        </span>
      </div>

      <SortableContext items={tickets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'flex flex-col gap-2 flex-1 min-h-24 rounded-lg p-2 transition-colors',
            isOver ? 'bg-surface-container' : 'bg-surface-container-low',
          )}
        >
          {tickets.map((t) => <TicketCard key={t.id} ticket={t} />)}

          {tickets.length === 0 && (
            <p className="text-label-md text-on-surface-variant text-center py-6">Sin tickets</p>
          )}
        </div>
      </SortableContext>

      <button
        onClick={onAddTicket}
        className="mt-2 flex items-center gap-2 w-full px-3 py-2 rounded border border-dashed border-outline text-label-lg text-on-surface-variant hover:bg-surface-container transition-colors"
      >
        <Plus size={14} /> Agregar ticket
      </button>
    </div>
  );
}
