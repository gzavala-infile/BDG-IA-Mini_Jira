import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useUsers, useCreateUser } from '@/api/users';
import { UserRow } from '@/components/users/UserRow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserCreateSchema, type UserCreateInput } from '@mini-jira/shared';
import { useUiStore } from '@/store/uiStore';

export function AdminUsersPage() {
  const { data: users = [], isLoading } = useUsers();
  const createUser = useCreateUser();
  const addToast = useUiStore((s) => s.addToast);
  const [createOpen, setCreateOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<UserCreateInput>({
    resolver: zodResolver(UserCreateSchema),
    defaultValues: { rol: 'usuario' },
  });

  async function onSubmit(data: UserCreateInput) {
    try {
      await createUser.mutateAsync(data);
      reset();
      setCreateOpen(false);
      addToast({ title: 'Usuario creado', description: data.email });
    } catch {
      addToast({ title: 'Error al crear usuario', variant: 'destructive' });
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-headline-lg text-on-surface">Gestión de Usuarios</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Nuevo usuario
        </Button>
      </div>

      {isLoading && <p className="text-body-md text-on-surface-variant">Cargando…</p>}

      {!isLoading && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low">
                <th className="text-left px-4 py-3 text-label-lg text-on-surface-variant uppercase tracking-wider">Nombre</th>
                <th className="text-left px-4 py-3 text-label-lg text-on-surface-variant uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 text-label-lg text-on-surface-variant uppercase tracking-wider">Rol</th>
                <th className="text-left px-4 py-3 text-label-lg text-on-surface-variant uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => <UserRow key={u.id} user={u} />)}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent title="Nuevo usuario">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1">Nombre</label>
              <Input {...register('nombre')} placeholder="Nombre completo" />
              {errors.nombre && <p className="text-label-md text-error mt-1">{errors.nombre.message}</p>}
            </div>
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1">Email</label>
              <Input type="email" {...register('email')} placeholder="email@empresa.com" />
              {errors.email && <p className="text-label-md text-error mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1">Contraseña</label>
              <Input type="password" {...register('password')} placeholder="Mínimo 8 caracteres" />
              {errors.password && <p className="text-label-md text-error mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1">Rol</label>
              <Select {...register('rol')}>
                <option value="usuario">Usuario</option>
                <option value="admin">Admin</option>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="subtle" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creando…' : 'Crear usuario'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
