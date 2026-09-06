import { resolveInverterIssue, resolveOperationsPlantStatus, sortAlertsByPriority } from './operations.status';

const collectable = {
  collectability: 'COLLECTABLE' as const,
  communicationOk: true,
  hasReading: true,
  hasOfflineAlert: false,
  hasErrorAlert: false,
  hasWarningAlert: false,
};

describe('Status operacional da Central', () => {
  it('usina ACTIVE sem coleta configurada permanece ONLINE cadastral', () => {
    expect(resolveOperationsPlantStatus('ACTIVE', [{
      ...collectable,
      collectability: 'BLOCKED',
      hasReading: false,
      communicationOk: null,
    }])).toBe('ONLINE');
  });

  it('AUXSOL BLOCKED não vira OFFLINE', () => {
    expect(resolveInverterIssue({
      collectability: 'BLOCKED',
      communicationOk: null,
      hasReading: false,
      hasOfflineAlert: false,
      hasErrorAlert: false,
      hasWarningAlert: false,
    })).toBeNull();
  });

  it('inversor coletável com communicationOk false é OFFLINE', () => {
    expect(resolveInverterIssue({ ...collectable, communicationOk: false })).toBe('OFFLINE');
  });

  it('todos os inversores coletáveis offline tornam a usina OFFLINE', () => {
    expect(resolveOperationsPlantStatus('ACTIVE', [
      { ...collectable, communicationOk: false, hasOfflineAlert: true },
    ])).toBe('OFFLINE');
  });

  it('um offline e um online geram WARNING', () => {
    expect(resolveOperationsPlantStatus('ACTIVE', [
      { ...collectable, communicationOk: false, hasOfflineAlert: true },
      collectable,
    ])).toBe('WARNING');
  });

  it('ordena alertas por severidade e data', () => {
    const sorted = sortAlertsByPriority([
      { severity: 'INFO', occurredAt: '2026-09-05T12:00:00.000Z' },
      { severity: 'CRITICAL', occurredAt: '2026-09-05T10:00:00.000Z' },
      { severity: 'CRITICAL', occurredAt: '2026-09-05T11:00:00.000Z' },
      { severity: 'WARNING', occurredAt: '2026-09-05T13:00:00.000Z' },
    ]);
    expect(sorted.map((item) => `${item.severity}:${item.occurredAt.slice(11, 13)}`)).toEqual([
      'CRITICAL:11',
      'CRITICAL:10',
      'WARNING:13',
      'INFO:12',
    ]);
  });
});
