import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TicketCreateSchema, type TicketCreateInput } from '@mini-jira/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { MarkdownEditor } from '@/components/markdown/MarkdownEditor';
import { TagInput } from './TagInput';
import { useUsers } from '@/api/users';

interface Props {
  onSubmit: (data: TicketCreateInput) => Promise<void>;
  onCancel: () => void;
}

export function TicketForm({ onSubmit, onCancel }: Props) {
  const { data: users = [] } = useUsers();
  const activeUsers = users.filter((u) => u.activo);

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<TicketCreateInput>({
    resolver: zodResolver(TicketCreateSchema),
    defaultValues: { prioridad: 'media', etiquetas: [] },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div>
        <label className="block text-label-md text-on-surface-variant mb-1">Título *</label>
        <Input {...register('titulo')} placeholder="Describe la tarea brevemente" maxLength={120} />
        {errors.titulo && <p className="text-label-md text-error mt-1">{errors.titulo.message}</p>}
      </div>

      <div>
        <label className="block text-label-md text-on-surface-variant mb-1">Descripción</label>
        <Controller name="descripcion" control={control} render={({ field }) => (
          <MarkdownEditor value={field.value ?? ''} onChange={field.onChange} />
        )} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-label-md text-on-surface-variant mb-1">Prioridad</label>
          <Select {...register('prioridad')}>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </Select>
        </div>

        <div>
          <label className="block text-label-md text-on-surface-variant mb-1">Asignar a</label>
          <Select {...register('asignado_a_id')}>
            <option value="">Sin asignar</option>
            {activeUsers.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-label-md text-on-surface-variant mb-1">Etiquetas</label>
        <Controller name="etiquetas" control={control} render={({ field }) => (
          <TagInput value={field.value ?? []} onChange={field.onChange} />
        )} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="subtle" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creando…' : 'Crear ticket'}</Button>
      </div>
    </form>
  );
}
