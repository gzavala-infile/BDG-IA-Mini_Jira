import type { Usuario } from '@mini-jira/shared';
import { useUpdateUser } from '@/api/users';
import { Button } from '@/components/ui/button';

export function UserRow({ user }: { user: Usuario }) {
  const update = useUpdateUser();

  function toggleActivo() { update.mutate({ id: user.id, data: { activo: !user.activo } }); }
  function toggleRol() { update.mutate({ id: user.id, data: { rol: user.rol === 'admin' ? 'usuario' : 'admin' } }); }

  return (
    <tr className="border-b border-outline-variant">
      <td className="py-3 px-4 text-body-md text-on-surface">{user.nombre}</td>
      <td className="py-3 px-4 text-body-md text-on-surface-variant">{user.email}</td>
      <td className="py-3 px-4">
        <span className={`text-label-lg rounded-xl px-2 py-0.5 ${user.rol === 'admin' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container text-on-surface-variant'}`}>
          {user.rol === 'admin' ? 'Admin' : 'Usuario'}
        </span>
      </td>
      <td className="py-3 px-4">
        <span className={`text-label-lg rounded-xl px-2 py-0.5 ${user.activo ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-error-container text-on-error-container'}`}>
          {user.activo ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex gap-2">
          <Button variant="subtle" size="sm" onClick={toggleActivo}>{user.activo ? 'Desactivar' : 'Activar'}</Button>
          <Button variant="subtle" size="sm" onClick={toggleRol}>
            {user.rol === 'admin' ? '→ Usuario' : '→ Admin'}
          </Button>
        </div>
      </td>
    </tr>
  );
}
