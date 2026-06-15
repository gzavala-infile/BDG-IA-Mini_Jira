import { Badge } from '@/components/ui/badge';
import { ESTADO_LABELS, ESTADO_COLORS } from '@/constants';
import type { EstadoTicket } from '@mini-jira/shared';

export function TicketStatusBadge({ estado }: { estado: EstadoTicket }) {
  return <Badge className={ESTADO_COLORS[estado]}>{ESTADO_LABELS[estado]}</Badge>;
}
