export type HistoryPeriod =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thisMonth'
  | 'previousMonth'
  | 'custom';

export const HISTORY_PERIOD_OPTIONS: Array<{ id: HistoryPeriod; label: string }> = [
  { id: 'today', label: 'Hoje' },
  { id: 'yesterday', label: 'Ontem' },
  { id: 'last7days', label: 'Últimos 7 dias' },
  { id: 'last30days', label: 'Últimos 30 dias' },
  { id: 'thisMonth', label: 'Este mês' },
  { id: 'previousMonth', label: 'Mês anterior' },
  { id: 'custom', label: 'Personalizado' },
];

export const HISTORY_EMPTY = 'Não existem leituras para o período.';
export const HISTORY_LOADING = 'Carregando histórico...';
export const HISTORY_ERROR = 'Não foi possível carregar o histórico.';
export const HISTORY_NO_GENERATION = 'Não há dados de geração disponíveis para o período selecionado.';

export type HistoryPoint = { label: string; energyKwh: number; collectedAt: string };

export function historyHasChart(points?: HistoryPoint[] | null) {
  return Boolean(points?.length);
}

export function buildHistoryQuery(input: {
  period: HistoryPeriod;
  plantId?: string;
  inverterId?: string;
  startDate?: string;
  endDate?: string;
  granularity?: string;
}) {
  const query = new URLSearchParams();
  if (input.period !== 'custom') query.set('period', input.period);
  if (input.period === 'custom' && input.startDate && input.endDate) {
    query.set('period', 'custom');
    query.set('startDate', input.startDate);
    query.set('endDate', input.endDate);
  }
  if (input.plantId) query.set('plantId', input.plantId);
  if (input.inverterId) query.set('inverterId', input.inverterId);
  if (input.granularity) query.set('granularity', input.granularity);
  return query.toString();
}
