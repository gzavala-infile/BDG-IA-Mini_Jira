import { useState } from 'react';
import { useMetrics } from '@/api/metrics';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { TicketsByStatusChart } from '@/components/dashboard/TicketsByStatusChart';
import { MonthYearPicker } from '@/components/dashboard/MonthYearPicker';
import { Avatar } from '@/components/ui/avatar';
import type { EstadoTicket } from '@mini-jira/shared';

export function DashboardPage() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const { data, isLoading } = useMetrics(mes, anio);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-headline-lg text-on-surface">Dashboard</h1>
        <MonthYearPicker mes={mes} anio={anio} onChange={(m, a) => { setMes(m); setAnio(a); }} />
      </div>

      {isLoading && <p className="text-body-md text-on-surface-variant">Cargando métricas…</p>}

      {data && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <MetricCard label="Tickets creados este mes" value={data.tickets_creados} />
            <MetricCard label="Tickets completados este mes" value={data.tickets_listos} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <TicketsByStatusChart data={data.distribucion_por_estado as Array<{ estado: EstadoTicket; total: number }>} />

            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 shadow-card">
              <p className="text-title-lg text-on-surface mb-4">Completados por persona</p>
              {data.tickets_listos_por_usuario.length === 0 ? (
                <p className="text-body-md text-on-surface-variant">Sin datos para este mes.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {data.tickets_listos_por_usuario.map(({ usuario, total }) =>
                    usuario ? (
                      <div key={usuario.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar nombre={usuario.nombre} size="sm" />
                          <span className="text-body-md text-on-surface">{usuario.nombre}</span>
                        </div>
                        <span className="text-title-md text-on-surface">{total}</span>
                      </div>
                    ) : null,
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
