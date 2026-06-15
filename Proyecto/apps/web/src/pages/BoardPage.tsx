import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTickets, useCreateTicket } from '@/api/tickets';
import { useBoardFilters } from '@/hooks/useBoardFilters';
import { useUiStore } from '@/store/uiStore';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { FilterBar } from '@/components/filters/FilterBar';
import { TicketDetailModal } from '@/components/tickets/TicketDetailModal';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { TicketForm } from '@/components/tickets/TicketForm';
import { Button } from '@/components/ui/button';
import type { TicketCreateInput } from '@mini-jira/shared';

export function BoardPage() {
  const { filters } = useBoardFilters();
  const { data: tickets = [], isLoading } = useTickets(filters);
  const createTicket = useCreateTicket();
  const addToast = useUiStore((s) => s.addToast);
  const [createOpen, setCreateOpen] = useState(false);

  async function handleCreate(data: TicketCreateInput) {
    await createTicket.mutateAsync(data);
    setCreateOpen(false);
    addToast({ title: 'Ticket creado', description: data.titulo });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-headline-lg text-on-surface">Tablero</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Nuevo ticket
        </Button>
      </div>

      <FilterBar />

      {isLoading ? (
        <p className="text-body-md text-on-surface-variant py-12 text-center">Cargando tickets…</p>
      ) : tickets.length === 0 && Object.keys(filters).some((k) => filters[k as keyof typeof filters]) ? (
        <div className="py-12 text-center">
          <p className="text-body-lg text-on-surface-variant mb-4">No hay tickets que coincidan con los filtros aplicados.</p>
          <p className="text-label-lg text-on-surface-variant">Intenta cambiar o limpiar los filtros.</p>
        </div>
      ) : (
        <KanbanBoard tickets={tickets} onAddTicket={() => setCreateOpen(true)} />
      )}

      <TicketDetailModal />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent title="Nuevo ticket">
          <TicketForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
