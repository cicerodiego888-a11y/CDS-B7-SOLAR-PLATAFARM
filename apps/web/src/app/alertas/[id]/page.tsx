'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../components/auth/AuthProvider';
import { Button } from '../../../components/ui/Button';
import { ErrorMessage } from '../../../components/ui/ErrorMessage';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { getAlertSeverityLabel, getAlertStatusLabel } from '../../../constants/inverters';
import { ApiError, fetchApi } from '../../../lib/api';
import { formatDateTime } from '../../../lib/format';
import { can } from '../../../lib/operational';

type AlertDetail = {
  id: string;
  title: string;
  description?: string | null;
  severity: string;
  status: string;
  ruleCode: string;
  occurredAt: string;
  acknowledgedAt?: string | null;
  acknowledgedBy?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  resolutionType?: string | null;
  plant?: { id: string; name: string; customer?: { id: string; name: string } | null };
  inverter?: { id: string; model?: string | null };
  events?: Array<{ id: string; type: string; actor: string; createdAt: string }>;
};

function resolutionLabel(value?: string | null) {
  if (value === 'AUTOMATIC') return 'Automática';
  if (value === 'MANUAL') return 'Manual';
  return '—';
}

function eventLabel(type: string) {
  if (type === 'ALERT_CREATED') return 'Criado';
  if (type === 'ALERT_ACKNOWLEDGED') return 'Reconhecido';
  if (type === 'ALERT_RESOLVED') return 'Resolvido';
  return type;
}

export default function AlertaDetalhePage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [data, setData] = useState<AlertDetail | null>(null);
  const [error, setError] = useState('');
  const canResolve = can(user, 'ALERTS_RESOLVE');

  const load = useCallback(() => {
    return fetchApi<AlertDetail>(`/alerts/${params.id}`)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Não foi possível carregar o alerta.'));
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(action: 'acknowledge' | 'resolve') {
    try {
      await fetchApi(`/alerts/${params.id}/${action}`, {
        method: action === 'acknowledge' ? 'POST' : 'PATCH',
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível atualizar o alerta.');
    }
  }

  if (error && !data) return <div className="shell"><ErrorMessage message={error} /></div>;
  if (!data) return <div className="shell"><LoadingState message="Carregando alerta..." /></div>;

  return (
    <div className="shell">
      <PageHeader
        title={data.title}
        description={data.ruleCode}
        actions={(
          <span className="toolbar-filters">
            <StatusBadge label={getAlertSeverityLabel(data.severity)} status={data.severity} />
            <StatusBadge label={getAlertStatusLabel(data.status)} status={data.status} />
            <Link href="/alertas"><Button variant="secondary">Voltar</Button></Link>
          </span>
        )}
      />
      {error ? <ErrorMessage message={error} /> : null}
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Detalhe operacional</h2>
            <p>Dados reais do incidente, sem duplicar o alerta na usina.</p>
          </div>
          {canResolve && data.status !== 'RESOLVED' ? (
            <span className="toolbar-filters">
              {data.status === 'OPEN' ? (
                <Button type="button" onClick={() => void act('acknowledge')}>Reconhecer</Button>
              ) : null}
              <Button variant="secondary" type="button" onClick={() => void act('resolve')}>Resolver</Button>
            </span>
          ) : null}
        </div>
        <dl className="detail-grid">
          <div><dt>Cliente</dt><dd>{data.plant?.customer?.name || '—'}</dd></div>
          <div><dt>Usina</dt><dd>{data.plant?.name || '—'}</dd></div>
          <div><dt>Inversor</dt><dd>{data.inverter?.model || data.inverter?.id || '—'}</dd></div>
          <div><dt>Regra</dt><dd>{data.ruleCode}</dd></div>
          <div><dt>Severidade</dt><dd>{getAlertSeverityLabel(data.severity)}</dd></div>
          <div><dt>Status</dt><dd>{getAlertStatusLabel(data.status)}</dd></div>
          <div><dt>Aberto em</dt><dd>{formatDateTime(data.occurredAt)}</dd></div>
          <div><dt>Reconhecido em</dt><dd>{data.acknowledgedAt ? formatDateTime(data.acknowledgedAt) : '—'}</dd></div>
          <div><dt>Reconhecido por</dt><dd>{data.acknowledgedBy || '—'}</dd></div>
          <div><dt>Resolvido em</dt><dd>{data.resolvedAt ? formatDateTime(data.resolvedAt) : '—'}</dd></div>
          <div><dt>Resolvido por</dt><dd>{data.resolvedBy || '—'}</dd></div>
          <div><dt>Tipo de resolução</dt><dd>{resolutionLabel(data.resolutionType)}</dd></div>
        </dl>
        <p>{data.description || 'Sem descrição.'}</p>
      </section>
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Histórico</h2>
            <p>Eventos do ciclo de vida do alerta.</p>
          </div>
        </div>
        {data.events?.length ? (
          <ul className="alert-list">
            {data.events.map((event) => (
              <li key={event.id}>
                <div>
                  <strong>{eventLabel(event.type)}</strong>
                  <p>{event.actor}</p>
                </div>
                <div className="alert-meta">
                  <span>{formatDateTime(event.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>Nenhum evento adicional registrado.</p>
        )}
      </section>
    </div>
  );
}
