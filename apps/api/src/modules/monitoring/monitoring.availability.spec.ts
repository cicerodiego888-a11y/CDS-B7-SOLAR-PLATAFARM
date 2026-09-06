import { MonitoringHistoryService } from './monitoring.history.service';
import {
  aggregatePlantAvailability,
  calculateInverterAvailability,
  classifyHealth,
  resolveObservedStatus,
} from './monitoring.availability';

const from = new Date('2026-09-05T12:00:00.000Z');
const to = new Date('2026-09-05T13:00:00.000Z');
const now = new Date('2026-09-05T13:00:00.000Z');
const maxGapSeconds = 900;

function reading(at: string, status: string, powerKw = 4) {
  return { collectedAt: new Date(at), status, powerKw, communicationOk: status !== 'OFFLINE' };
}

function compute(readings: ReturnType<typeof reading>[], extra: Record<string, unknown> = {}) {
  return calculateInverterAvailability({
    inverterId: 'i1',
    plantId: 'p1',
    period: 'custom',
    timezone: 'America/Sao_Paulo',
    from,
    to,
    now,
    maxGapSeconds,
    readings,
    ...extra,
  });
}

describe('Disponibilidade operacional', () => {
  it('1. nenhuma leitura retorna N/D e cobertura 0', () => {
    const result = compute([]);
    expect(result.availabilityPercent).toBeNull();
    expect(result.coveragePercent).toBe(0);
    expect(result.reason).toBe('NO_DATA');
    expect(result.health).toBe('NO_DATA');
  });

  it('2. uma leitura segura o estado só até o gap', () => {
    const result = compute([reading('2026-09-05T12:00:00.000Z', 'ONLINE')]);
    expect(result.onlineSeconds).toBe(900);
    expect(result.unobservedSeconds).toBe(2700);
    expect(result.availabilityPercent).toBe(100);
    expect(result.coveragePercent).toBe(25);
  });

  it('3. duas leituras próximas permanecem observadas', () => {
    const result = compute([
      reading('2026-09-05T12:00:00.000Z', 'ONLINE'),
      reading('2026-09-05T12:05:00.000Z', 'ONLINE'),
    ]);
    expect(result.onlineSeconds).toBe(1200);
    expect(result.unobservedSeconds).toBe(2400);
  });

  it('4. sequência totalmente ONLINE', () => {
    const result = compute([
      reading('2026-09-05T12:00:00.000Z', 'ONLINE'),
      reading('2026-09-05T12:10:00.000Z', 'ONLINE'),
      reading('2026-09-05T12:20:00.000Z', 'ONLINE'),
    ]);
    expect(result.offlineSeconds).toBe(0);
    expect(result.availabilityPercent).toBe(100);
    expect(result.health).toBe('HEALTHY');
  });

  it('5. sequência ONLINE + WARNING', () => {
    const result = compute([
      reading('2026-09-05T12:00:00.000Z', 'ONLINE'),
      reading('2026-09-05T12:05:00.000Z', 'WARNING'),
    ]);
    expect(result.warningSeconds).toBeGreaterThan(0);
    expect(result.onlineSeconds).toBe(300);
    expect(result.availabilityPercent).toBe(100);
    expect(result.health).toBe('ATTENTION');
  });

  it('6. sequência ONLINE + OFFLINE', () => {
    const result = compute([
      reading('2026-09-05T12:00:00.000Z', 'ONLINE'),
      reading('2026-09-05T12:05:00.000Z', 'OFFLINE'),
    ]);
    expect(result.offlineSeconds).toBeGreaterThan(0);
    expect(result.availabilityPercent).toBeLessThan(100);
    expect(result.health).toBe('CRITICAL');
  });

  it('7. sequência ONLINE + ERROR', () => {
    const result = compute([
      reading('2026-09-05T12:00:00.000Z', 'ONLINE'),
      reading('2026-09-05T12:05:00.000Z', 'ERROR'),
    ]);
    expect(result.errorSeconds).toBeGreaterThan(0);
    expect(result.health).toBe('CRITICAL');
  });

  it('8. gap menor que o limite permanece observado', () => {
    const result = compute([
      reading('2026-09-05T12:00:00.000Z', 'ONLINE'),
      reading('2026-09-05T12:10:00.000Z', 'ONLINE'),
    ]);
    expect(result.onlineSeconds).toBe(1500);
  });

  it('9. gap maior que o limite vira UNOBSERVED', () => {
    const result = compute([
      reading('2026-09-05T12:00:00.000Z', 'ONLINE'),
      reading('2026-09-05T12:40:00.000Z', 'ONLINE'),
    ]);
    expect(result.onlineSeconds).toBe(1800);
    expect(result.unobservedSeconds).toBe(1800);
  });

  it('10. ausência após o último ponto respeita o gap', () => {
    const result = compute([reading('2026-09-05T12:50:00.000Z', 'ONLINE')]);
    expect(result.onlineSeconds).toBe(600);
    expect(result.unobservedSeconds).toBe(3000);
  });

  it('11. timestamp fora do período é ignorado', () => {
    const result = compute([
      reading('2026-09-05T11:00:00.000Z', 'OFFLINE'),
      reading('2026-09-05T13:30:00.000Z', 'ERROR'),
    ]);
    expect(result.offlineSeconds).toBe(0);
    expect(result.errorSeconds).toBe(0);
    expect(result.reason).toBe('NO_DATA');
  });

  it('12. timestamp duplicado não duplica tempo', () => {
    const result = compute([
      reading('2026-09-05T12:00:00.000Z', 'ONLINE'),
      reading('2026-09-05T12:00:00.000Z', 'WARNING'),
    ]);
    expect(result.onlineSeconds).toBe(0);
    expect(result.warningSeconds).toBe(900);
  });

  it('13. timezone America/Sao_Paulo vem do parser do histórico', () => {
    process.env.MONITORING_TIMEZONE = 'America/Sao_Paulo';
    const parsed = new MonitoringHistoryService({} as never, {} as never).parseQuery({
      period: 'custom',
      startDate: '2026-09-05',
      endDate: '2026-09-06',
    });
    expect(parsed.from.toISOString()).toBe('2026-09-05T03:00:00.000Z');
    expect(parsed.to.toISOString()).toBe('2026-09-07T03:00:00.000Z');
  });

  it('14. inverter BLOCKED não vira offline nem 0%', () => {
    const result = compute([reading('2026-09-05T12:00:00.000Z', 'ONLINE')], { collectability: 'BLOCKED' });
    expect(result.availabilityPercent).toBeNull();
    expect(result.coveragePercent).toBe(0);
    expect(result.reason).toBe('INTEGRATION_BLOCKED');
    expect(result.health).toBe('NO_DATA');
    expect(result.offlineSeconds).toBe(0);
  });

  it('15. inverter NOT_CONFIGURED não vira offline', () => {
    const result = compute([], { collectability: 'NOT_CONFIGURED' });
    expect(result.reason).toBe('INTEGRATION_NOT_CONFIGURED');
    expect(result.availabilityPercent).toBeNull();
    expect(result.health).toBe('NO_DATA');
  });

  it('16. potência zero com status ONLINE não é OFFLINE', () => {
    expect(resolveObservedStatus({ collectedAt: from, status: 'ONLINE', powerKw: 0, communicationOk: true })).toBe('ONLINE');
    const result = compute([reading('2026-09-05T12:00:00.000Z', 'ONLINE', 0)]);
    expect(result.offlineSeconds).toBe(0);
    expect(result.onlineSeconds).toBe(900);
  });

  it('17. múltiplos inversores agregam por tempo observável, não por média', () => {
    const a = compute([
      reading('2026-09-05T12:00:00.000Z', 'ONLINE'),
      reading('2026-09-05T12:10:00.000Z', 'ONLINE'),
    ], { inverterId: 'a' });
    const b = calculateInverterAvailability({
      inverterId: 'b',
      plantId: 'p1',
      period: 'custom',
      timezone: 'America/Sao_Paulo',
      from,
      to,
      now,
      maxGapSeconds,
      readings: [reading('2026-09-05T12:00:00.000Z', 'OFFLINE')],
    });
    const plant = aggregatePlantAvailability({
      plantId: 'p1',
      period: 'custom',
      timezone: 'America/Sao_Paulo',
      from,
      to,
      inverters: [a, b],
    });
    expect(plant.onlineSeconds).toBe(a.onlineSeconds);
    expect(plant.offlineSeconds).toBe(b.offlineSeconds);
    expect(plant.availabilityPercent).not.toBe(Number(((a.availabilityPercent! + b.availabilityPercent!) / 2).toFixed(1)));
  });

  it('18. cobertura parcial', () => {
    const result = compute([reading('2026-09-05T12:00:00.000Z', 'ONLINE')]);
    expect(result.coveragePercent).toBe(25);
    expect(result.coveragePercent).toBeLessThan(100);
  });

  it('19. disponibilidade alta com cobertura baixa fica em atenção', () => {
    const result = compute([reading('2026-09-05T12:00:00.000Z', 'ONLINE')]);
    expect(result.availabilityPercent).toBe(100);
    expect(result.coveragePercent).toBeLessThan(50);
    expect(result.health).toBe('ATTENTION');
  });

  it('20. disponibilidade sem dados não devolve 0%', () => {
    const result = compute([]);
    expect(result.availabilityPercent).toBeNull();
    expect(result.availabilityPercent).not.toBe(0);
  });

  it('21. usina sem inversores elegíveis', () => {
    const blocked = compute([], { collectability: 'BLOCKED' });
    const plant = aggregatePlantAvailability({
      plantId: 'p1',
      period: 'custom',
      timezone: 'America/Sao_Paulo',
      from,
      to,
      inverters: [blocked],
    });
    expect(plant.reason).toBe('NO_ELIGIBLE_INVERTERS');
    expect(plant.availabilityPercent).toBeNull();
    expect(plant.eligibleInverters).toBe(0);
  });

  it('22. usina com parte dos inversores sem dados', () => {
    const observed = compute([
      reading('2026-09-05T12:00:00.000Z', 'ONLINE'),
      reading('2026-09-05T12:05:00.000Z', 'ONLINE'),
      reading('2026-09-05T12:10:00.000Z', 'ONLINE'),
      reading('2026-09-05T12:15:00.000Z', 'ONLINE'),
      reading('2026-09-05T12:20:00.000Z', 'ONLINE'),
      reading('2026-09-05T12:25:00.000Z', 'ONLINE'),
      reading('2026-09-05T12:30:00.000Z', 'ONLINE'),
      reading('2026-09-05T12:35:00.000Z', 'ONLINE'),
      reading('2026-09-05T12:40:00.000Z', 'ONLINE'),
      reading('2026-09-05T12:45:00.000Z', 'ONLINE'),
    ]);
    const empty = compute([]);
    const plant = aggregatePlantAvailability({
      plantId: 'p1',
      period: 'custom',
      timezone: 'America/Sao_Paulo',
      from,
      to,
      inverters: [observed, empty],
    });
    expect(plant.observedInverters).toBe(1);
    expect(plant.invertersWithoutData).toBe(1);
    expect(plant.health).toBe('ATTENTION');
  });

  it('23. estado crítico', () => {
    expect(classifyHealth({
      reason: 'OK',
      evidenceSeconds: 100,
      coveragePercent: 90,
      warningSeconds: 0,
      offlineSeconds: 40,
      errorSeconds: 0,
      hasCriticalEquipmentAlert: false,
      hasWarningAlert: false,
    })).toBe('CRITICAL');
  });

  it('24. estado warning', () => {
    const result = compute([
      reading('2026-09-05T12:00:00.000Z', 'WARNING'),
      reading('2026-09-05T12:10:00.000Z', 'WARNING'),
      reading('2026-09-05T12:20:00.000Z', 'WARNING'),
    ]);
    expect(result.health).toBe('ATTENTION');
  });

  it('25. estado saudável com cobertura suficiente', () => {
    const points = Array.from({ length: 12 }, (_, index) => (
      reading(new Date(from.getTime() + index * 5 * 60 * 1000).toISOString(), 'ONLINE')
    ));
    const result = compute(points);
    expect(result.coveragePercent).toBeGreaterThanOrEqual(50);
    expect(result.availabilityPercent).toBe(100);
    expect(result.health).toBe('HEALTHY');
  });
});
