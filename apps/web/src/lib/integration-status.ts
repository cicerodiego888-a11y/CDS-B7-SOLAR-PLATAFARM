export function integrationBindingLabel(input: {
  manufacturerCode?: string | null;
  status?: string | null;
  lastErrorMessage?: string | null;
  hasBinding?: boolean;
}) {
  const status = input.status ?? null;
  if (status === 'AUTH_ERROR' || status === 'COMMUNICATION_ERROR') {
    return 'Falha na comunicação';
  }
  if (status === 'READY' || status === 'CONNECTED') {
    return 'Configuração pronta';
  }
  if (!input.hasBinding && !status) {
    return 'Integração não configurada';
  }
  if (
    status === 'BLOCKED'
    || /bloquead|contrato oficial/i.test(input.lastErrorMessage ?? '')
    || input.manufacturerCode === 'AUXSOL'
    || (input.manufacturerCode && input.manufacturerCode !== 'AUXSOL')
  ) {
    return 'Integração aguardando configuração/contrato oficial';
  }
  return 'Integração não configurada';
}
