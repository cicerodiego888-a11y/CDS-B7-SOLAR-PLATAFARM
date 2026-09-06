type Breakdown = { label: string; value: string | number; tone?: 'success' | 'warning' | 'danger' | 'neutral' };

type Props = {
  title: string;
  value: string | number;
  note?: string;
  comparison?: string;
  accent?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'orange';
  breakdown?: Breakdown[];
};

export function MetricCard({ title, value, note, comparison, accent = 'blue', breakdown }: Props) {
  return (
    <article className={`card metric-card metric-${accent}`}>
      <span>{title}</span>
      <div className="metric-value">
        <strong>{value}</strong>
        {comparison ? <em>{comparison}</em> : null}
      </div>
      {note ? <small>{note}</small> : null}
      {breakdown?.length ? (
        <div className="metric-breakdown">
          {breakdown.map((item) => (
            <span key={item.label} className={`tone-${item.tone || 'neutral'}`}>
              {item.value} {item.label}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
