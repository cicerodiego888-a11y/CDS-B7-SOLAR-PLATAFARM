type Point = { label: string; valueKwh: number };

type Props = {
  points: Point[];
};

export function GenerationChart({ points }: Props) {
  if (!points.length) {
    return (
      <div className="empty compact">
        <h3>Não existem leituras para o período.</h3>
        <p>Não há dados de geração disponíveis para o período selecionado.</p>
      </div>
    );
  }

  const width = 640;
  const height = 220;
  const padding = 28;
  const max = Math.max(...points.map((point) => point.valueKwh), 0);
  const chartMax = max === 0 ? 1 : max;
  const step = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

  const coords = points.map((point, index) => {
    const x = padding + index * step;
    const y = height - padding - (point.valueKwh / chartMax) * (height - padding * 2);
    return `${x},${y}`;
  });

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gráfico de geração de energia">
        <polyline fill="none" stroke="#2563eb" strokeWidth="3" points={coords.join(' ')} />
        {points.map((point, index) => {
          const x = padding + index * step;
          const y = height - padding - (point.valueKwh / chartMax) * (height - padding * 2);
          return <circle key={`${point.label}-${index}`} cx={x} cy={y} r="4" fill="#1d4ed8" />;
        })}
      </svg>
      <div className="chart-labels">
        {points.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
    </div>
  );
}
