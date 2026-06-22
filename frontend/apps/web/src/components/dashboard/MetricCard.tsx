interface Props { label: string; value: number | string; }
export function MetricCard({ label, value }: Props) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 shadow-card">
      <p className="text-label-lg text-on-surface-variant uppercase tracking-wider mb-2">{label}</p>
      <p className="font-heading text-display-sm text-on-surface">{value}</p>
    </div>
  );
}
