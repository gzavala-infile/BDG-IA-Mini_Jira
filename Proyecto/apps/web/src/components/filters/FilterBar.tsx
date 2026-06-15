import { Search, X } from 'lucide-react';
import { useBoardFilters } from '@/hooks/useBoardFilters';
import { useUsers } from '@/api/users';
import { ESTADO_LABELS, ESTADOS_ORDER, PRIORIDAD_LABELS } from '@/constants';
import type { EstadoTicket, PrioridadTicket } from '@mini-jira/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRef } from 'react';

function MultiToggle<T extends string>({ options, selected, onToggle, labelMap }: {
  options: T[]; selected: T[]; onToggle: (v: T) => void; labelMap: Record<T, string>;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onToggle(o)}
          className={`px-2 py-0.5 rounded-full text-label-lg transition-colors ${selected.includes(o) ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
        >
          {labelMap[o]}
        </button>
      ))}
    </div>
  );
}

export function FilterBar() {
  const { filters, setFilter, clearFilters, hasFilters } = useBoardFilters();
  const { data: users = [] } = useUsers();
  const searchRef = useRef<HTMLInputElement>(null);

  function toggleEstado(e: EstadoTicket) {
    const curr = filters.estado ?? [];
    setFilter('estado', curr.includes(e) ? curr.filter((x) => x !== e) : [...curr, e]);
  }

  function togglePrioridad(p: PrioridadTicket) {
    const curr = filters.prioridad ?? [];
    setFilter('prioridad', curr.includes(p) ? curr.filter((x) => x !== p) : [...curr, p]);
  }

  return (
    <div className="flex flex-wrap items-center gap-4 mb-6 bg-surface-container-low border border-outline-variant rounded-lg px-4 py-3">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <Input
          ref={searchRef}
          defaultValue={filters.q ?? ''}
          onBlur={(e) => setFilter('q', e.target.value || null)}
          onKeyDown={(e) => e.key === 'Enter' && setFilter('q', (e.target as HTMLInputElement).value || null)}
          placeholder="Buscar tickets…"
          className="pl-8 w-48 h-8 text-label-lg"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-label-md text-on-surface-variant">Estado:</span>
        <MultiToggle
          options={ESTADOS_ORDER}
          selected={(filters.estado ?? []) as EstadoTicket[]}
          onToggle={toggleEstado}
          labelMap={ESTADO_LABELS}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-label-md text-on-surface-variant">Prioridad:</span>
        <MultiToggle
          options={['alta', 'media', 'baja'] as PrioridadTicket[]}
          selected={(filters.prioridad ?? []) as PrioridadTicket[]}
          onToggle={togglePrioridad}
          labelMap={PRIORIDAD_LABELS}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-label-md text-on-surface-variant">Asignado a:</span>
        <select
          value={filters.asignado_a ?? ''}
          onChange={(e) => setFilter('asignado_a', e.target.value || null)}
          className="rounded border border-outline-variant bg-surface-container-lowest px-2 py-0.5 text-label-lg text-on-surface focus:outline-none focus:border-primary-container"
        >
          <option value="">Todos</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
        </select>
      </div>

      {hasFilters && (
        <Button variant="subtle" size="sm" onClick={clearFilters} className="ml-auto">
          <X size={12} /> Limpiar filtros
        </Button>
      )}
    </div>
  );
}
