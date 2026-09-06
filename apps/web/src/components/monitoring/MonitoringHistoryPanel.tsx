'use client';

import { useEffect, useState } from 'react';
import { GenerationChart } from '../dashboard/GenerationChart';
import { EmptyState } from '../ui/EmptyState';
import { ErrorMessage } from '../ui/ErrorMessage';
import { LoadingState } from '../ui/LoadingState';
import { SelectField } from '../ui/SelectField';
import { TextField } from '../ui/TextField';
import { formatEnergyKwh } from '../../lib/format';
import { comparisonLabel } from '../../lib/dashboard';
import {
  HISTORY_EMPTY,
  HISTORY_ERROR,
  HISTORY_LOADING,
  HISTORY_NO_GENERATION,
  HISTORY_PERIOD_OPTIONS,
  HistoryPeriod,
  buildHistoryQuery,
} from '../../lib/monitoring-history';
import { ApiError, fetchApi } from '../../lib/api';

type HistoryResponse = {
  hasData: boolean;
  energyKwh: number | null;
  previousEnergyKwh: number | null;
  comparisonPercent: number | null;
  series: Array<{ label: string; energyKwh: number; collectedAt: string }>;
  emptyMessage?: string | null;
  granularity: string;
  notes?: string[];
  timezone?: string;
};

type Props = {
  endpoint: string;
  lockPlant?: boolean;
  lockInverter?: boolean;
  plantId?: string;
  inverterId?: string;
  plants?: Array<{ id: string; name: string }>;
  inverters?: Array<{ id: string; model?: string | null }>;
};

export function MonitoringHistoryPanel({
  endpoint,
  lockPlant,
  lockInverter,
  plantId,
  inverterId,
  plants = [],
  inverters = [],
}: Props) {
  const [period, setPeriod] = useState<HistoryPeriod>('last7days');
  const [selectedPlant, setSelectedPlant] = useState(plantId || '');
  const [selectedInverter, setSelectedInverter] = useState(inverterId || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSelectedPlant(plantId || '');
  }, [plantId]);

  useEffect(() => {
    setSelectedInverter(inverterId || '');
  }, [inverterId]);

  useEffect(() => {
    if (period === 'custom' && (!startDate || !endDate)) return;
    const query = buildHistoryQuery({
      period,
      plantId: lockPlant ? plantId : selectedPlant,
      inverterId: lockInverter ? inverterId : selectedInverter,
      startDate,
      endDate,
    });
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetchApi<HistoryResponse | { history: HistoryResponse }>(`${endpoint}?${query}`)
      .then((payload) => {
        const history = 'history' in payload ? payload.history : payload;
        setData(history);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setData(null);
        setError(err instanceof ApiError ? err.message : HISTORY_ERROR);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [endpoint, period, selectedPlant, selectedInverter, startDate, endDate, lockPlant, lockInverter, plantId, inverterId]);

  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h2>Monitoramento</h2>
          <p>Histórico real das leituras persistidas. Sem dados fictícios.</p>
        </div>
      </div>
      <div className="toolbar-filters">
        <SelectField
          id="history-period"
          label="Período"
          value={period}
          options={HISTORY_PERIOD_OPTIONS.map((item) => ({ value: item.id, label: item.label }))}
          onChange={(value) => setPeriod(value as HistoryPeriod)}
        />
        {!lockPlant ? (
          <SelectField
            id="history-plant"
            label="Usina"
            value={selectedPlant}
            placeholder="Todas"
            options={plants.map((plant) => ({ value: plant.id, label: plant.name }))}
            onChange={setSelectedPlant}
          />
        ) : null}
        {!lockInverter ? (
          <SelectField
            id="history-inverter"
            label="Inversor"
            value={selectedInverter}
            placeholder="Todos"
            options={inverters.map((item) => ({ value: item.id, label: item.model || item.id }))}
            onChange={setSelectedInverter}
          />
        ) : null}
        {period === 'custom' ? (
          <>
            <TextField id="history-start" label="Início" type="date" value={startDate} onChange={setStartDate} />
            <TextField id="history-end" label="Fim" type="date" value={endDate} onChange={setEndDate} />
          </>
        ) : null}
      </div>
      {loading ? <LoadingState message={HISTORY_LOADING} /> : null}
      {error ? <ErrorMessage title={HISTORY_ERROR} message={error} /> : null}
      {!loading && !error && data ? (
        <>
          <section className="cards" style={{ marginTop: 16 }}>
            <article className="card">
              <span>Geração no período</span>
              <strong>{formatEnergyKwh(data.energyKwh, data.hasData)}</strong>
            </article>
            <article className="card">
              <span>Período anterior</span>
              <strong>{formatEnergyKwh(data.previousEnergyKwh, data.previousEnergyKwh !== null)}</strong>
            </article>
            <article className="card">
              <span>Variação</span>
              <strong>{comparisonLabel(data.comparisonPercent) ?? 'Dados insuficientes'}</strong>
            </article>
          </section>
          {data.hasData ? (
            <GenerationChart points={data.series.map((point) => ({ label: point.label, valueKwh: point.energyKwh }))} />
          ) : (
            <EmptyState title={HISTORY_EMPTY} description={HISTORY_NO_GENERATION} />
          )}
        </>
      ) : null}
    </section>
  );
}
