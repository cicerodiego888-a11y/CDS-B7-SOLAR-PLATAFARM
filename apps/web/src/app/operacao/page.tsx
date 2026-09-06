'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../components/auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { LoadingState } from '../../components/ui/LoadingState';
import { MetricCard } from '../../components/ui/MetricCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { SelectField } from '../../components/ui/SelectField';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { TextField } from '../../components/ui/TextField';
import { getAlertSeverityLabel, getAlertStatusLabel } from '../../constants/inverters';
import { ApiError, fetchApi } from '../../lib/api';
import { DASHBOARD_POLL_MS } from '../../lib/dashboard';
import { healthLabel } from '../../lib/availability';
import { formatCoveragePercent, formatEnergyKwh, formatPercentOrNd, formatRelativeTime } from '../../lib/format';
import { can, formatInstalledKwp } from '../../lib/operational';
import {
  OPERATIONS_EMPTY_ALERTS,
  OPERATIONS_EMPTY_ISSUES,
  OPERATIONS_EMPTY_PLANTS,
  OPERATIONS_ERROR,
  OPERATIONS_LOADING,
  OPERATIONS_PERIODS,
  OPERATIONS_STATUS_OPTIONS,
  buildOperationsQuery,
  operationsAlertHref,
  operationsInverterHref,
  operationsPlantHref,
  operationsStatusLabel,
} from '../../lib/operations-center';

type OperationsOverview = {
  period: string;
  health: { api: string; database: string; redis: string; status: string };
  summary: {
    plants: number;
    plantsOnline: number;
    plantsWarning: number;
    plantsOffline: number;
    inverters: number;
    invertersOnline: number;
    invertersWarning: number;
    invertersOffline: number;
    openAlerts: number;
  };
  plants: Array<{
    id: string;
    name: string;
    customerId: string;
    customerName: string | null;
    operationalStatus: string;
    installedPowerKwp: number | null;
    energyKwh: number | null;
    hasGeneration: boolean;
    inverterCount: number;
    activeAlerts: number;
    lastReadingAt: string | null;
    availabilityPercent?: number | null;
    coveragePercent?: number;
    health?: string;
    availabilityReason?: string;
  }>;
  inverterIssues: Array<{
    id: string;
    model: string | null;
    plantId: string;
    plantName: string;
    status: string;
    lastReadingAt: string | null;
    lastAlert: { id: string; title: string; severity: string } | null;
    availabilityPercent?: number | null;
    coveragePercent?: number;
    health?: string;
  }>;
  alerts: Array<{
    id: string;
    title: string;
    severity: string;
    status: string;
    occurredAt: string;
    plantId: string;
    plantName: string | null;
    inverterId: string | null;
    inverterName: string | null;
  }>;
  recent: Array<{ type: string; at: string; label: string; plantId: string; inverterId?: string | null }>;
  empty: { plants: boolean; alerts: boolean; issues: boolean; readings: boolean };
};

export default function OperacaoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [period, setPeriod] = useState('today');
  const [status, setStatus] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [customers, setCustomers] = useState<Array<{ value: string; label: string }>>([]);
  const [data, setData] = useState<OperationsOverview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const canResolve = can(user, 'ALERTS_RESOLVE');

  useEffect(() => {
    if (user && !can(user, 'MONITORING_VIEW')) router.replace('/acesso-negado');
  }, [user, router]);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const overview = await fetchApi<OperationsOverview>(`/operations/overview?${buildOperationsQuery({
        period,
        status,
        customerId,
        search: appliedSearch,
      })}`);
      setData(overview);
    } catch (err) {
      setData(null);
      setError(err instanceof ApiError ? err.message : OPERATIONS_ERROR);
    } finally {
      setLoading(false);
    }
  }, [period, status, customerId, appliedSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    fetchApi<Array<{ id: string; name: string }>>('/customers')
      .then((rows) => setCustomers(rows.map((item) => ({ value: item.id, label: item.name }))))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => void load(), DASHBOARD_POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  async function act(id: string, action: 'acknowledge' | 'resolve') {
    setActionError('');
    try {
      await fetchApi(`/alerts/${id}/${action}`, { method: action === 'acknowledge' ? 'POST' : 'PATCH' });
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Não foi possível atualizar o alerta.');
    }
  }

  return (
    <div className="shell">
      <PageHeader
        title="Central de Operação"
        description="Acompanhamento operacional das usinas, inversores e alertas."
        actions={(
          <span className="toolbar-filters">
            <span className="status">{data?.health.status === 'ok' ? 'Sistema operacional' : data ? `API ${data.health.api} · Banco ${data.health.database} · Redis ${data.health.redis}` : '—'}</span>
            <Button type="button" variant="secondary" onClick={() => void load()}>Atualizar</Button>
          </span>
        )}
      />

      <section className="panel">
        <div className="toolbar-filters">
          <SelectField
            id="op-period"
            label="Período"
            value={period}
            options={OPERATIONS_PERIODS.map((item) => ({ value: item.id, label: item.label }))}
            onChange={setPeriod}
          />
          <SelectField
            id="op-status"
            label="Status"
            value={status}
            placeholder="Todos"
            options={OPERATIONS_STATUS_OPTIONS}
            onChange={setStatus}
          />
          <SelectField
            id="op-customer"
            label="Cliente"
            value={customerId}
            placeholder="Todos"
            options={customers}
            onChange={setCustomerId}
          />
          <TextField
            id="op-search"
            label="Busca"
            value={search}
            placeholder="Usina, cliente ou inversor"
            onChange={setSearch}
          />
          <Button type="button" onClick={() => setAppliedSearch(search)}>Buscar</Button>
        </div>
      </section>

      {loading && !data ? <LoadingState message={OPERATIONS_LOADING} /> : null}
      {error ? <ErrorMessage title={OPERATIONS_ERROR} message={error} onAction={() => void load()} /> : null}
      {actionError ? <ErrorMessage message={actionError} /> : null}

      {data ? (
        <>
          <section className="cards">
            <MetricCard title="Usinas" value={data.summary.plants} note="Monitoradas" accent="blue" />
            <MetricCard title="Online" value={data.summary.plantsOnline} accent="green" />
            <MetricCard title="Atenção" value={data.summary.plantsWarning} accent="amber" />
            <MetricCard title="Offline" value={data.summary.plantsOffline} accent="red" />
            <MetricCard title="Inversores" value={data.summary.inverters} note={`${data.summary.invertersOnline} online`} accent="purple" />
            <MetricCard title="Alertas abertos" value={data.summary.openAlerts} accent="orange" />
          </section>

          <section className="panel">
            <div className="panel-title">
              <div>
                <h2>Situação das usinas</h2>
                <p>Geração do período pela mesma regra do histórico.</p>
              </div>
            </div>
            <DataTable
              rows={data.plants}
              rowKey={(row) => row.id}
              columns={[
                { key: 'name', header: 'Usina', render: (row) => <Link href={operationsPlantHref(row.id)}>{row.name}</Link> },
                { key: 'customer', header: 'Cliente', render: (row) => row.customerName || '—' },
                {
                  key: 'status',
                  header: 'Status',
                  render: (row) => <StatusBadge label={operationsStatusLabel(row.operationalStatus)} status={row.operationalStatus} />,
                },
                { key: 'power', header: 'Potência instalada', render: (row) => formatInstalledKwp(row.installedPowerKwp) },
                { key: 'energy', header: 'Geração', render: (row) => formatEnergyKwh(row.energyKwh, row.hasGeneration) },
                { key: 'inverters', header: 'Inversores', render: (row) => row.inverterCount },
                { key: 'availability', header: 'Disponibilidade', render: (row) => formatPercentOrNd(row.availabilityPercent) },
                { key: 'coverage', header: 'Cobertura', render: (row) => formatCoveragePercent(row.coveragePercent) },
                {
                  key: 'health',
                  header: 'Saúde',
                  render: (row) => <StatusBadge label={healthLabel(row.health, row.availabilityReason)} status={row.health} />,
                },
                { key: 'alerts', header: 'Alertas', render: (row) => row.activeAlerts },
                { key: 'last', header: 'Última leitura', render: (row) => formatRelativeTime(row.lastReadingAt) },
              ]}
              empty={<EmptyState title={OPERATIONS_EMPTY_PLANTS} description="Cadastre usinas para acompanhar a operação." />}
            />
          </section>

          <section className="panel">
            <div className="panel-title">
              <div>
                <h2>Alertas prioritários</h2>
                <p>Somente abertos e reconhecidos, na ordem de severidade.</p>
              </div>
              <Link href="/alertas"><Button variant="secondary">Ver alertas</Button></Link>
            </div>
            <DataTable
              rows={data.alerts}
              rowKey={(row) => row.id}
              columns={[
                { key: 'title', header: 'Alerta', render: (row) => <Link href={operationsAlertHref(row.id)}>{row.title}</Link> },
                { key: 'plant', header: 'Usina', render: (row) => <Link href={operationsPlantHref(row.plantId)}>{row.plantName || '—'}</Link> },
                {
                  key: 'inverter',
                  header: 'Inversor',
                  render: (row) => row.inverterId ? <Link href={operationsInverterHref(row.inverterId)}>{row.inverterName || row.inverterId}</Link> : '—',
                },
                { key: 'severity', header: 'Severidade', render: (row) => <StatusBadge label={getAlertSeverityLabel(row.severity)} status={row.severity} /> },
                { key: 'status', header: 'Estado', render: (row) => getAlertStatusLabel(row.status) },
                {
                  key: 'actions',
                  header: 'Ações',
                  render: (row) => canResolve && row.status !== 'RESOLVED' ? (
                    <span className="toolbar-filters">
                      {row.status === 'OPEN' ? (
                        <Button variant="secondary" type="button" onClick={() => void act(row.id, 'acknowledge')}>Reconhecer</Button>
                      ) : null}
                      <Button variant="ghost" type="button" onClick={() => void act(row.id, 'resolve')}>Resolver</Button>
                    </span>
                  ) : null,
                },
              ]}
              empty={<EmptyState title={OPERATIONS_EMPTY_ALERTS} description="Não há incidentes abertos no momento." />}
            />
          </section>

          <section className="panel">
            <div className="panel-title">
              <div>
                <h2>Inversores com atenção</h2>
                <p>OFFLINE, ERROR e WARNING. Integração bloqueada não entra nesta lista.</p>
              </div>
            </div>
            <DataTable
              rows={data.inverterIssues}
              rowKey={(row) => row.id}
              columns={[
                { key: 'model', header: 'Inversor', render: (row) => <Link href={operationsInverterHref(row.id)}>{row.model || row.id}</Link> },
                { key: 'plant', header: 'Usina', render: (row) => <Link href={operationsPlantHref(row.plantId)}>{row.plantName}</Link> },
                { key: 'status', header: 'Status', render: (row) => <StatusBadge label={operationsStatusLabel(row.status)} status={row.status} /> },
                { key: 'availability', header: 'Disponibilidade', render: (row) => formatPercentOrNd(row.availabilityPercent) },
                { key: 'coverage', header: 'Cobertura', render: (row) => formatCoveragePercent(row.coveragePercent ?? 0) },
                {
                  key: 'health',
                  header: 'Saúde',
                  render: (row) => <StatusBadge label={healthLabel(row.health, undefined)} status={row.health || 'NO_DATA'} />,
                },
                { key: 'last', header: 'Última leitura', render: (row) => formatRelativeTime(row.lastReadingAt) },
                {
                  key: 'alert',
                  header: 'Último alerta',
                  render: (row) => row.lastAlert ? <Link href={operationsAlertHref(row.lastAlert.id)}>{row.lastAlert.title}</Link> : '—',
                },
              ]}
              empty={<EmptyState title={OPERATIONS_EMPTY_ISSUES} description="Nenhum inversor coletável apresenta falha." />}
            />
          </section>

          <section className="panel">
            <div className="panel-title">
              <div>
                <h2>Atualizações recentes</h2>
                <p>Leituras e alertas reais, sem eventos artificiais.</p>
              </div>
            </div>
            {data.recent.length ? (
              <ul className="alert-list">
                {data.recent.map((item, index) => (
                  <li key={`${item.type}-${item.at}-${index}`}>
                    <div>
                      <strong>{item.label}</strong>
                      <p>{item.type === 'READING' ? 'Leitura' : 'Alerta'}</p>
                    </div>
                    <div className="alert-meta">
                      <span>{formatRelativeTime(item.at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Nenhuma leitura disponível." description="A coleta ainda não persistiu eventos." />
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
