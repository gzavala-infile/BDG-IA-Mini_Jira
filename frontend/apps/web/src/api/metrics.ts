import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { MetricasMes } from '@mini-jira/shared';

export function useMetrics(mes: number, anio: number) {
  return useQuery({
    queryKey: ['metrics', { mes, anio }],
    queryFn: () => apiFetch<MetricasMes>(`/metrics?mes=${mes}&anio=${anio}`),
  });
}
