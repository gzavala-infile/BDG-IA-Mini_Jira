import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { EstadoTicket } from '@mini-jira/shared';
import { ESTADO_LABELS } from '@/constants';

const CHART_COLORS: Record<EstadoTicket, string> = {
  por_hacer: '#737685',
  en_progreso: '#003d9b',
  bloqueado: '#5e4db9',
  listo: '#004e32',
};

interface Props {
  data: Array<{ estado: EstadoTicket; total: number }>;
}

export function TicketsByStatusChart({ data }: Props) {
  const chartData = data.map((d) => ({ name: ESTADO_LABELS[d.estado], value: d.total, color: CHART_COLORS[d.estado] }));

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 shadow-card">
      <p className="text-title-lg text-on-surface mb-4">Distribución por estado</p>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
            {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
