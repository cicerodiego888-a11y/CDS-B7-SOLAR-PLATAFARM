import { IntegrationCollectability } from '../alerts/alert.types';

export type OperationsPlantStatus = 'ONLINE' | 'WARNING' | 'OFFLINE' | 'UNKNOWN';
export type OperationsInverterIssue = 'OFFLINE' | 'ERROR' | 'WARNING';

export type InverterOperationInput = {
  collectability: IntegrationCollectability;
  communicationOk: boolean | null;
  hasReading: boolean;
  hasOfflineAlert: boolean;
  hasErrorAlert: boolean;
  hasWarningAlert: boolean;
};

export function resolveOperationsPlantStatus(
  plantStatus: string,
  inverters: InverterOperationInput[],
): OperationsPlantStatus {
  if (plantStatus === 'INACTIVE') return 'UNKNOWN';
  if (plantStatus === 'OFFLINE') return 'OFFLINE';
  if (plantStatus === 'WARNING') return 'WARNING';

  const monitored = inverters.filter((item) => item.collectability === 'COLLECTABLE');
  if (!monitored.length) {
    return plantStatus === 'ACTIVE' ? 'ONLINE' : 'UNKNOWN';
  }

  const offline = monitored.filter((item) => item.hasOfflineAlert || (item.hasReading && item.communicationOk === false));
  const warning = monitored.filter((item) => item.hasWarningAlert || item.hasErrorAlert);
  if (offline.length && offline.length === monitored.length) return 'OFFLINE';
  if (offline.length || warning.length) return 'WARNING';
  return 'ONLINE';
}

export function resolveInverterIssue(input: InverterOperationInput): OperationsInverterIssue | null {
  if (input.collectability !== 'COLLECTABLE') return null;
  if (input.hasErrorAlert) return 'ERROR';
  if (input.hasOfflineAlert || (input.hasReading && input.communicationOk === false)) return 'OFFLINE';
  if (input.hasWarningAlert) return 'WARNING';
  return null;
}

export function sortAlertsByPriority<T extends { severity: string; occurredAt: Date | string }>(alerts: T[]) {
  const rank: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };
  return [...alerts].sort((left, right) => {
    const severity = (rank[left.severity] ?? 9) - (rank[right.severity] ?? 9);
    if (severity !== 0) return severity;
    return new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime();
  });
}
