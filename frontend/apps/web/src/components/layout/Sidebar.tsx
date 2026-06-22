import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Kanban, Archive, Users, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/api/client';
import { cn } from '@/lib/utils';

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 px-3 py-2 rounded text-body-md transition-colors',
    isActive
      ? 'bg-primary-container text-on-primary font-semibold'
      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
  );

export function Sidebar() {
  const { user, isAdmin, clearAuth } = useAuth();

  async function handleLogout() {
    const rt = localStorage.getItem('refreshToken');
    await apiFetch('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: rt }) }).catch(() => {});
    clearAuth();
  }

  return (
    <aside className="flex flex-col w-56 min-h-screen bg-surface-container-low border-r border-outline-variant px-3 py-6 shrink-0">
      <div className="mb-8 px-3">
        <span className="font-heading text-headline-md text-on-surface">Mini Jira</span>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        <NavLink to="/board" className={navClass}>
          <Kanban size={16} /> Tablero
        </NavLink>
        <NavLink to="/archive" className={navClass}>
          <Archive size={16} /> Archivados
        </NavLink>
        <NavLink to="/dashboard" className={navClass}>
          <LayoutDashboard size={16} /> Dashboard
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin/users" className={navClass}>
            <Users size={16} /> Usuarios
          </NavLink>
        )}
      </nav>

      <div className="border-t border-outline-variant pt-4 mt-4">
        <div className="px-3 mb-3">
          <p className="text-title-md text-on-surface truncate">{user?.nombre}</p>
          <p className="text-label-md text-on-surface-variant truncate">{user?.email}</p>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2 rounded text-body-md text-on-surface-variant hover:bg-surface-container hover:text-error transition-colors">
          <LogOut size={16} /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
