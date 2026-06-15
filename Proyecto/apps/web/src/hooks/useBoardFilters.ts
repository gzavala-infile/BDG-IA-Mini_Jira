import { useSearchParams } from 'react-router-dom';
import type { TicketFilters } from '@/api/tickets';

export function useBoardFilters() {
  const [params, setParams] = useSearchParams();

  const filters: TicketFilters = {
    estado: params.getAll('estado').length > 0 ? params.getAll('estado') : undefined,
    prioridad: params.getAll('prioridad').length > 0 ? params.getAll('prioridad') : undefined,
    asignado_a: params.get('asignado_a') ?? undefined,
    etiqueta: params.getAll('etiqueta').length > 0 ? params.getAll('etiqueta') : undefined,
    q: params.get('q') ?? undefined,
    fecha_desde: params.get('fecha_desde') ?? undefined,
    fecha_hasta: params.get('fecha_hasta') ?? undefined,
  };

  function setFilter(key: string, value: string | string[] | null) {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete(key);
      if (Array.isArray(value)) value.forEach((v) => next.append(key, v));
      else if (value) next.set(key, value);
      return next;
    });
  }

  function clearFilters() { setParams(new URLSearchParams()); }

  const hasFilters = [...params.entries()].length > 0;

  return { filters, setFilter, clearFilters, hasFilters };
}
