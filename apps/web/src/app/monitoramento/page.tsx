'use client';

import { useEffect, useState } from 'react';
import { MonitoringHistoryPanel } from '../../components/monitoring/MonitoringHistoryPanel';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { LoadingState } from '../../components/ui/LoadingState';
import { MetricCard } from '../../components/ui/MetricCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { getPlantStatusLabel } from '../../constants/inverters';
import { fetchApi } from '../../lib/api';

type Overview = {
  totals: { plants: number; active: number; warning: number; offline: number; openAlerts: number };
  plants: Array<{ id: string; name: string; status: string; customer?: { name: string } }>;
};

type Inverter = { id: string; model?: string | null };

export default function MonitoramentoPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [inverters, setInverters] = useState<Inverter[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchApi<Overview>('/monitoring/overview')
      .then(setData)
      .catch((err: Error) => setError(err.message));
    fetchApi<Inverter[]>('/inverters').then(setInverters).catch(() => undefined);
  }, []);

  return (
    <div className="shell">
      <PageHeader
        title="Monitoramento"
        description="Histórico real e visão operacional das usinas."
        actions={data ? <span className="status">API conectada</span> : null}
      />

      {error ? <ErrorMessage message={error} /> : null}
      {!error && !data ? <LoadingState message="Carregando visão operacional..." /> : null}

      {data ? (
        <>
          <section className="cards">
            <MetricCard title="Usinas" value={data.totals.plants} note="Total cadastradas" />
            <MetricCard title="Normais" value={data.totals.active} note="Operação normal" />
            <MetricCard title="Atenção" value={data.totals.warning} note="Precisam de análise" />
            <MetricCard title="Alertas" value={data.totals.openAlerts} note="Em aberto" />
          </section>
          <MonitoringHistoryPanel
            endpoint="/monitoring/history"
            plants={data.plants}
            inverters={inverters}
          />
          <section className="panel">
            <div className="panel-title">
              <div>
                <h2>Usinas monitoradas</h2>
                <p>Dados provenientes do núcleo central.</p>
              </div>
            </div>
            <DataTable
              rows={data.plants}
              rowKey={(row) => row.id}
              columns={[
                { key: 'name', header: 'Usina', render: (row) => row.name },
                { key: 'customer', header: 'Cliente', render: (row) => row.customer?.name || '—' },
                {
                  key: 'status',
                  header: 'Status',
                  render: (row) => <StatusBadge label={getPlantStatusLabel(row.status)} status={row.status} />,
                },
              ]}
              empty={<EmptyState title="Nenhuma usina encontrada" description="As usinas cadastradas aparecerão nesta tabela." />}
            />
          </section>
        </>
      ) : null}
    </div>
  );
}
