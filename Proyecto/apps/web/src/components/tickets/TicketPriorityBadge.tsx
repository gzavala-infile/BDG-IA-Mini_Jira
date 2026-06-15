import { Badge } from '@/components/ui/badge';
import { PRIORIDAD_LABELS, PRIORIDAD_COLORS } from '@/constants';
import type { PrioridadTicket } from '@mini-jira/shared';

export function TicketPriorityBadge({ prioridad }: { prioridad: PrioridadTicket }) {
  return <Badge className={PRIORIDAD_COLORS[prioridad]}>{PRIORIDAD_LABELS[prioridad]}</Badge>;
}
