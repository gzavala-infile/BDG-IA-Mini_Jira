import { useState } from 'react';
import {
  DndContext, DragEndEvent, DragOverlay as DndDragOverlay,
  DragStartEvent, PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core';
import type { Ticket, EstadoTicket } from '@mini-jira/shared';
import { ESTADOS_ORDER } from '@/constants';
import { KanbanColumn } from './KanbanColumn';
import { TicketCard } from './TicketCard';
import { useUpdateTicket } from '@/api/tickets';
import { useTicketPermissions } from '@/hooks/useTicketPermissions';
import { useUiStore } from '@/store/uiStore';

interface Props {
  tickets: Ticket[];
  onAddTicket: () => void;
}

export function KanbanBoard({ tickets, onAddTicket }: Props) {
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const updateTicket = useUpdateTicket();
  const addToast = useUiStore((s) => s.addToast);
  const perms = useTicketPermissions(activeTicket);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function onDragStart({ active }: DragStartEvent) {
    const t = tickets.find((t) => t.id === active.id);
    setActiveTicket(t ?? null);
  }

  async function onDragEnd({ active, over }: DragEndEvent) {
    setActiveTicket(null);
    if (!over || active.id === over.id) return;

    const ticket = tickets.find((t) => t.id === active.id);
    if (!ticket) return;

    const newEstado = ESTADOS_ORDER.includes(over.id as EstadoTicket)
      ? (over.id as EstadoTicket)
      : tickets.find((t) => t.id === over.id)?.estado;

    if (!newEstado || newEstado === ticket.estado) return;

    if (!perms.canChangeStatus) {
      addToast({ title: 'Sin permiso', description: 'No puedes cambiar el estado de este ticket.', variant: 'destructive' });
      return;
    }

    try {
      await updateTicket.mutateAsync({ id: ticket.id, data: { estado: newEstado, version: ticket.version } });
    } catch (err: unknown) {
      const e = err as { body?: { error?: string }; statusCode?: number };
      if (e?.body?.error === 'version_conflict') {
        addToast({ title: 'Conflicto de versión', description: 'Otro usuario modificó este ticket mientras lo editabas. Recarga para ver los cambios.', variant: 'destructive' });
      } else if (e?.body?.error === 'archived') {
        addToast({ title: 'Ticket archivado', description: 'Este ticket fue archivado y es de solo lectura.', variant: 'destructive' });
      } else {
        addToast({ title: 'Error', description: 'No se pudo actualizar el ticket.', variant: 'destructive' });
      }
    }
  }

  const byEstado = (estado: EstadoTicket) => tickets.filter((t) => t.estado === estado);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {ESTADOS_ORDER.map((estado) => (
          <KanbanColumn
            key={estado}
            estado={estado}
            tickets={byEstado(estado)}
            onAddTicket={onAddTicket}
          />
        ))}
      </div>

      <DndDragOverlay>
        {activeTicket && <TicketCard ticket={activeTicket} overlay />}
      </DndDragOverlay>
    </DndContext>
  );
}
