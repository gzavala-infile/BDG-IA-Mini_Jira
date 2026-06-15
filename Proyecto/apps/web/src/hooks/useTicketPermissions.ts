import type { Ticket } from '@mini-jira/shared';
import { useAuth } from './useAuth';

export interface TicketPermissions {
  canEdit: boolean;
  canChangeStatus: boolean;
  canArchive: boolean;
  canReassign: boolean;
  canComment: boolean;
  isReadOnly: boolean;
}

export function useTicketPermissions(ticket: Ticket | null): TicketPermissions {
  const { user, isAdmin } = useAuth();

  if (!ticket || !user) {
    return { canEdit: false, canChangeStatus: false, canArchive: false, canReassign: false, canComment: false, isReadOnly: true };
  }

  const isArchived = ticket.archived_at !== null;
  const isCreator = ticket.creado_por.id === user.id;

  return {
    isReadOnly: isArchived,
    canEdit: !isArchived && (isAdmin || isCreator),
    canChangeStatus: !isArchived && (isAdmin || isCreator),
    canArchive: !isArchived && (isAdmin || isCreator),
    canReassign: !isArchived && isAdmin,
    canComment: !isArchived,
  };
}
