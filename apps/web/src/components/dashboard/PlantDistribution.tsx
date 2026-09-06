import Link from 'next/link';
import { Button } from '../ui/Button';

type Props = {
  online: number;
  offline: number;
  maintenance: number;
  plants: Array<{
    id: string;
    name: string;
    operationalStatus: string;
    latitude: number | null;
    longitude: number | null;
  }>;
};

export function PlantDistribution({ online, offline, maintenance, plants }: Props) {
  const total = Math.max(online + offline + maintenance, 1);
  const geoReady = plants.some((plant) => plant.latitude !== null && plant.longitude !== null);

  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h2>Distribuição das usinas</h2>
          <p>{geoReady ? 'Coordenadas disponíveis para mapa futuro.' : 'Representação operacional sem mapa geográfico.'}</p>
        </div>
        <Link href="/usinas">
          <Button variant="secondary">Ver todas</Button>
        </Link>
      </div>
      <div className="distribution-bars">
        <DistributionRow label="Online" value={online} total={total} tone="success" />
        <DistributionRow label="Offline" value={offline} total={total} tone="danger" />
        <DistributionRow label="Em manutenção" value={maintenance} total={total} tone="neutral" />
      </div>
    </section>
  );
}

function DistributionRow({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: string;
}) {
  return (
    <div className="distribution-row">
      <div>
        <strong>{label}</strong>
        <span>{value}</span>
      </div>
      <div className="distribution-track">
        <i className={`tone-${tone}`} style={{ width: `${(value / total) * 100}%` }} />
      </div>
    </div>
  );
}
