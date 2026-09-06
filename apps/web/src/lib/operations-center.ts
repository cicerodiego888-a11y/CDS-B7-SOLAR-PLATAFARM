export const OPERATIONS_PERIODS = [
  { id: 'today', label: 'Hoje' },
  { id: 'yesterday', label: 'Ontem' },
  { id: 'last7days', label: 'Últimos 7 dias' },
  { id: 'last30days', label: 'Últimos 30 dias' },
  { id: 'thisMonth', label: 'Este mês' },
];

export const OPERATIONS_STATUS_OPTIONS = [
  { value: 'ONLINE', label: 'Online' },
  { value: 'WARNING', label: 'Atenção' },
  { value: 'OFFLINE', label: 'Offline' },
];

export const OPERATIONS_EMPTY_PLANTS = 'Nenhuma usina cadastrada.';
export const OPERATIONS_EMPTY_ALERTS = 'Nenhum alerta ativo.';
export const OPERATIONS_EMPTY_ISSUES = 'Todos os inversores estão operacionais.';
export const OPERATIONS_LOADING = 'Carregando central de operação...';
export const OPERATIONS_ERROR = 'Não foi possível carregar a Central de Operação.';

export function buildOperationsQuery(input: {
  period: string;
  status?: string;
  customerId?: string;
  search?: string;
}) {
  const query = new URLSearchParams();
  query.set('period', input.period);
  if (input.status) query.set('status', input.status);
  if (input.customerId) query.set('customerId', input.customerId);
  if (input.search?.trim()) query.set('search', input.search.trim());
  return query.toString();
}

export function operationsPlantHref(id: string) {
  return `/usinas/${id}`;
}

export function operationsInverterHref(id: string) {
  return `/inversores/${id}`;
}

export function operationsAlertHref(id: string) {
  return `/alertas/${id}`;
}

export function operationsStatusLabel(status?: string | null) {
  if (status === 'ONLINE') return 'Online';
  if (status === 'WARNING') return 'Atenção';
  if (status === 'OFFLINE') return 'Offline';
  if (status === 'ERROR') return 'Erro';
  return 'Indefinido';
}
