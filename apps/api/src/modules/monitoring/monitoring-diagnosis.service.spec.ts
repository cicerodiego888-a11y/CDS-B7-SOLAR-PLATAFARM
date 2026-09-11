import { MonitoringDiagnosisService } from './monitoring-diagnosis.service';

function makeService() {
  return new MonitoringDiagnosisService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { resolveCollectability: (inverter: { manufacturer: string; bindings: Array<{ provider: string; status?: string }> }) => {
      const binding = inverter.bindings.find((item) => item.provider === inverter.manufacturer);
      if (!binding) return 'NOT_CONFIGURED';
      if (binding.status === 'NOT_CONFIGURED') return 'NOT_CONFIGURED';
      if (binding.status === 'BLOCKED') return 'BLOCKED';
      return 'COLLECTABLE';
    } } as never,
  );
}

function inverter(ratedPowerKw: number | null = 50, bindingStatus = 'READY') {
  return {
    id: 'inv-1',
    manufacturer: 'AUXSOL',
    model: 'INV-001',
    serialNumber: 'SER-1',
    ratedPowerKw,
    manufacturerId: 'manufacturer-1',
    manufacturerRef: { id: 'manufacturer-1', name: 'Auxsol', code: 'AUXSOL' },
    bindings: [{ provider: 'AUXSOL', status: bindingStatus, lastSyncAt: null }],
    plant: { id: 'plant-1', name: 'Usina B7', customer: { id: 'customer-1', name: 'Cliente B7' } },
  } as never;
}

function availability(coveragePercent = 100, reason = 'OK') {
  return { availabilityPercent: 94.8, coveragePercent, reason, observedSeconds: coveragePercent ? 100 : 0 } as never;
}

function alert(ruleCode: string, severity = 'CRITICAL', createdAt = new Date('2026-09-07T16:42:00Z')) {
  return { id: `alert-${ruleCode}`, ruleCode, severity, status: 'OPEN', occurredAt: createdAt, createdAt } as never;
}

describe('MonitoringDiagnosisService', () => {
  it.each([
    ['INVERTER_OFFLINE', 'Inversor sem comunicação', 'CRITICAL'],
    ['INVERTER_ERROR', 'Falha reportada pelo inversor', 'CRITICAL'],
    ['INVERTER_WARNING', 'Inversor operando em estado de atenção', 'WARNING'],
    ['NO_RECENT_READING', 'Sem leitura recente', 'CRITICAL'],
  ])('deriva %s', (code, title, severity) => {
    const service = makeService() as any;
    const result = service.buildDiagnosis(inverter(), null, [alert(code, severity)], availability(), undefined);
    expect(result).toMatchObject({ code, title, severity, status: code === 'INVERTER_WARNING' ? 'ATTENTION' : 'ACTIVE' });
    expect(result.alertReference.id).toBe(`alert-${code}`);
  });

  it('preserva código e mensagem reais do payload de erro', () => {
    const service = makeService() as any;
    const result = service.buildDiagnosis(inverter(), {
      collectedAt: new Date('2026-09-07T16:40:00Z'),
      communicationOk: true,
      rawPayload: { normalizedStatus: 'ERROR', errorCode: 'E-42', errorMessage: 'Temperatura alta' },
    }, [alert('INVERTER_ERROR')], availability(), undefined);
    expect(result.evidence).toMatchObject({ equipmentCode: 'E-42', equipmentMessage: 'Temperatura alta', normalizedStatus: 'ERROR' });
  });

  it.each([
    ['NOT_CONFIGURED', 'INTEGRATION_NOT_CONFIGURED', 'Integração não configurada'],
    ['BLOCKED', 'INTEGRATION_BLOCKED', 'Integração bloqueada'],
  ])('deriva estado de integração %s', (bindingStatus, code, title) => {
    const service = makeService() as any;
    const result = service.buildDiagnosis(inverter(50, bindingStatus), null, [], availability(), undefined);
    expect(result).toMatchObject({ code, title, status: 'ATTENTION' });
  });

  it('deriva baixa cobertura sem afirmar indisponibilidade', () => {
    const service = makeService() as any;
    const result = service.buildDiagnosis(inverter(), { collectedAt: new Date(), communicationOk: true, rawPayload: { normalizedStatus: 'ONLINE' } }, [], availability(20), undefined);
    expect(result).toMatchObject({ code: 'LOW_COVERAGE', status: 'ATTENTION' });
  });

  it('não cria incidente para online, inclusive com 0 kW', () => {
    const service = makeService() as any;
    const result = service.buildDiagnosis(inverter(), { collectedAt: new Date(), communicationOk: true, powerKw: 0, rawPayload: { normalizedStatus: 'ONLINE' } }, [], availability(), undefined);
    expect(result).toBeNull();
  });

  it('usa NO_DATA sem leitura e não inventa duração', () => {
    const service = makeService() as any;
    const result = service.buildDiagnosis(inverter(), null, [], availability(0, 'NO_DATA'), undefined);
    expect(result).toMatchObject({ code: 'NO_DATA', status: 'NO_DATA' });
    expect(result.since).toBeUndefined();
  });

  it('prioriza alerta crítico e nunca retorna duração negativa', () => {
    const service = makeService() as any;
    const future = alert('INVERTER_WARNING', 'WARNING', new Date('2999-01-01T00:00:00Z'));
    const result = service.buildDiagnosis(inverter(), null, [future, alert('INVERTER_OFFLINE')], availability(), undefined);
    expect(result.code).toBe('INVERTER_OFFLINE');
    expect(result.durationSeconds).toBeGreaterThanOrEqual(0);
  });

  it('mantém impacto sem potência nominal quando o dado não existe', () => {
    const service = makeService() as any;
    const result = service.buildDiagnosis(inverter(null), { collectedAt: new Date(), communicationOk: false, rawPayload: null }, [alert('INVERTER_OFFLINE')], availability(), undefined);
    expect(result.impact).toEqual({ affectedInverters: 1, ratedPowerKw: null });
  });

  it('ordena por severidade, impacto e ocorrência mais antiga', () => {
    const service = makeService() as any;
    const items = [
      { severity: 'INFO', impact: { ratedPowerKw: 100 }, since: '2026-09-07T10:00:00Z' },
      { severity: 'CRITICAL', impact: { ratedPowerKw: 20 }, since: '2026-09-07T12:00:00Z' },
      { severity: 'CRITICAL', impact: { ratedPowerKw: 50 }, since: '2026-09-07T14:00:00Z' },
    ];
    expect(service.sortDiagnoses(items).map((item: typeof items[number]) => item.impact.ratedPowerKw)).toEqual([50, 20, 100]);
  });
});