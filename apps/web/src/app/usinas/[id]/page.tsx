'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { DataTable } from '../../../components/ui/DataTable';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorMessage } from '../../../components/ui/ErrorMessage';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { ApiError, fetchApi } from '../../../lib/api';
import { MonitoringHistoryPanel } from '../../../components/monitoring/MonitoringHistoryPanel';
import { getAlertSeverityLabel, getAlertStatusLabel } from '../../../constants/inverters';
import { healthLabel, periodLabel } from '../../../lib/availability';
import { formatCoveragePercent, formatDateTime, formatEnergyKwh, formatPercentOrNd } from '../../../lib/format';
import { equipmentTypeLabel, formatInstalledKwp, plantOperationalLabel, recordStatusLabel } from '../../../lib/operational';

type Plant = {
  id: string;
  name: string;
  status: string;
  installedPowerKw?: string | number | null;
  distributor?: string | null;
  consumerUnit?: string | null;
  address?: string | null;
  customer?: { id: string; name: string };
  inverters: Array<{ id: string; model?: string | null; serialNumber?: string | null; status?: string | null; manufacturerRef?: { name: string } | null }>;
  equipment: Array<{ id: string; type: string; model?: string | null; serialNumber: string; status: string }>;
};

type PlantMonitoring = {
  kpis: {
    periodEnergyKwh: number | null;
    installedPowerKwp: number | null;
    inverterCount: number;
    invertersOnline: number | null;
    invertersOffline: number | null;
    activeAlerts: number;
    comparisonPercent: number | null;
    performanceNote: string;
  };
  availability?: {
    availabilityPercent: number | null;
    coveragePercent: number;
    health: string;
    reason: string;
    period: string;
    eligibleInverters: number;
    observedInverters: number;
    invertersWithoutData: number;
    warningSeconds: number;
    offlineSeconds: number;
    errorSeconds: number;
  } | null;
  alerts: Array<{ id: string; title: string; severity: string; status: string; occurredAt: string; inverter?: { model?: string | null } | null }>;
};

export default function UsinaDetalhePage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Plant | null>(null);
  const [monitoring, setMonitoring] = useState<PlantMonitoring | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchApi<Plant>(`/plants/${params.id}`)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Não foi possível carregar a usina.'));
    fetchApi<PlantMonitoring>(`/monitoring/plants/${params.id}/history?period=today`)
      .then(setMonitoring)
      .catch(() => undefined);
  }, [params.id]);

  if (error) return <div className="shell"><ErrorMessage message={error} /></div>;
  if (!data) return <div className="shell"><LoadingState message="Carregando usina..." /></div>;

  return (
    <div className="shell">
      <PageHeader
        title={data.name}
        description={`Cliente: ${data.customer?.name || '—'} · ${formatInstalledKwp(data.installedPowerKw)} · UC ${data.consumerUnit || '—'}`}
        actions={<StatusBadge label={plantOperationalLabel(data.status)} status={data.status} />}
      />
      <section className="cards">
        <article className="card"><span>Concessionária</span><strong>{data.distributor || '—'}</strong></article>
        <article className="card"><span>Endereço</span><strong>{data.address || '—'}</strong></article>
        <article className="card"><span>Inversores</span><strong>{data.inverters.length}</strong></article>
        <article className="card"><span>Equipamentos</span><strong>{data.equipment.length}</strong></article>
        <article className="card"><span>Geração hoje</span><strong>{formatEnergyKwh(monitoring?.kpis.periodEnergyKwh ?? null, monitoring?.kpis.periodEnergyKwh != null)}</strong></article>
        <article className="card"><span>Inversores online</span><strong>{monitoring?.kpis.invertersOnline ?? '—'}</strong></article>
        <article className="card"><span>Alertas ativos</span><strong>{monitoring?.kpis.activeAlerts ?? 0}</strong></article>
      </section>
      <section className="panel" style={{ marginTop: 18 }}>
        <div className="panel-title">
          <div>
            <h2>Saúde operacional</h2>
            <p>
              {monitoring?.availability?.availabilityPercent == null
                ? 'Não há dados suficientes para calcular a disponibilidade.'
                : `Período: ${periodLabel(monitoring.availability.period)}.`}
            </p>
          </div>
        </div>
        <section className="cards" style={{ marginTop: 20 }}>
          <article className="card">
            <span>Saúde</span>
            <strong>
              <StatusBadge
                label={healthLabel(monitoring?.availability?.health, monitoring?.availability?.reason)}
                status={monitoring?.availability?.health || 'NO_DATA'}
              />
            </strong>
          </article>
          <article className="card"><span>Disponibilidade</span><strong>{formatPercentOrNd(monitoring?.availability?.availabilityPercent)}</strong></article>
          <article className="card"><span>Cobertura</span><strong>{formatCoveragePercent(monitoring?.availability?.coveragePercent ?? 0)}</strong></article>
          <article className="card"><span>Inversores observados</span><strong>{monitoring?.availability?.observedInverters ?? 0}</strong></article>
          <article className="card"><span>Sem dados</span><strong>{monitoring?.availability?.invertersWithoutData ?? data.inverters.length}</strong></article>
          <article className="card"><span>Warning / offline / error</span><strong>
            {(monitoring?.availability?.warningSeconds ?? 0) > 0 || (monitoring?.availability?.offlineSeconds ?? 0) > 0 || (monitoring?.availability?.errorSeconds ?? 0) > 0
              ? 'Há intervalos observados nesses estados'
              : 'Nenhum no período'}
          </strong></article>
        </section>
      </section>
      <MonitoringHistoryPanel
        endpoint={`/monitoring/plants/${data.id}/history`}
        lockPlant
        plantId={data.id}
        inverters={data.inverters}
      />
      {monitoring ? (
        <section className="panel" style={{ marginTop: 18 }}>
          <div className="panel-title">
            <div>
              <h2>Alertas da usina</h2>
              <p>{monitoring.kpis.performanceNote}</p>
            </div>
          </div>
          <DataTable
            rows={monitoring.alerts}
            rowKey={(row) => row.id}
            columns={[
              { key: 'title', header: 'Alerta', render: (row) => row.title },
              { key: 'inverter', header: 'Inversor', render: (row) => row.inverter?.model || '—' },
              { key: 'severity', header: 'Severidade', render: (row) => getAlertSeverityLabel(row.severity) },
              { key: 'status', header: 'Estado', render: (row) => getAlertStatusLabel(row.status) },
              { key: 'when', header: 'Horário', render: (row) => formatDateTime(row.occurredAt) },
            ]}
            empty={<EmptyState title="Nenhum alerta" description="Os alertas dos inversores desta usina aparecerão aqui." />}
          />
        </section>
      ) : null}
      <section className="panel">
        <div className="panel-title">
          <div><h2>Inversores</h2><p>Vinculados a esta usina e ao catálogo de fabricantes.</p></div>
          <Link href={`/inversores?usina=${data.id}`}><Button>Ver inversores</Button></Link>
        </div>
        <DataTable
          rows={data.inverters}
          rowKey={(row) => row.id}
          columns={[
            { key: 'model', header: 'Modelo', render: (row) => <Link href={`/inversores/${row.id}`}>{row.model || 'Inversor'}</Link> },
            { key: 'manufacturer', header: 'Fabricante', render: (row) => row.manufacturerRef?.name || '—' },
            { key: 'serial', header: 'Série', render: (row) => row.serialNumber || '—' },
            { key: 'status', header: 'Status', render: (row) => <StatusBadge label={recordStatusLabel(row.status)} status={row.status} /> },
          ]}
          empty={<EmptyState title="Nenhum inversor" description="Cadastre o primeiro inversor desta usina." />}
        />
      </section>
      <section className="panel" style={{ marginTop: 18 }}>
        <div className="panel-title">
          <div><h2>Equipamentos</h2><p>Inventário complementar da usina.</p></div>
          <Link href={`/equipamentos?usina=${data.id}`}><Button variant="secondary">Ver equipamentos</Button></Link>
        </div>
        <DataTable
          rows={data.equipment}
          rowKey={(row) => row.id}
          columns={[
            { key: 'type', header: 'Tipo', render: (row) => equipmentTypeLabel(row.type) },
            { key: 'model', header: 'Modelo', render: (row) => row.model || '—' },
            { key: 'serial', header: 'Série', render: (row) => row.serialNumber },
            { key: 'status', header: 'Status', render: (row) => <StatusBadge label={recordStatusLabel(row.status)} status={row.status} /> },
          ]}
          empty={<EmptyState title="Nenhum equipamento" description="Cadastre equipamentos desta usina." />}
        />
      </section>
    </div>
  );
}
