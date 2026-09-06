import {
  buildGenerationSeries,
  comparisonPercent,
  periodRange,
  resolveOperationalStatus,
  toNumber,
} from './monitoring.aggregation';

describe('Agregação do painel de monitoramento', () => {
  it('diferencia ausência de dado de zero', () => {
    expect(toNumber(null)).toBeNull();
    expect(toNumber(0)).toBe(0);
  });

  it('mapeia status da usina para estado operacional', () => {
    expect(resolveOperationalStatus('ACTIVE', true)).toBe('ONLINE');
    expect(resolveOperationalStatus('OFFLINE')).toBe('OFFLINE');
    expect(resolveOperationalStatus('WARNING')).toBe('WARNING');
    expect(resolveOperationalStatus('INACTIVE')).toBe('UNKNOWN');
    expect(resolveOperationalStatus('ACTIVE', false)).toBe('ERROR');
  });

  it('não inventa percentual sem base comparativa', () => {
    expect(comparisonPercent(10, null)).toBeNull();
    expect(comparisonPercent(12, 10)).toBe(20);
  });

  it('não gera série quando não há leituras no período', () => {
    process.env.MONITORING_TIMEZONE = 'America/Sao_Paulo';
    const now = new Date('2026-09-05T18:00:00.000Z');
    const series = buildGenerationSeries(
      [{ plantId: 'p1', collectedAt: new Date('2026-08-01T10:00:00.000Z'), energyTodayKwh: 12 }],
      'today',
      now,
    );
    expect(series).toEqual([]);
    expect(periodRange('today', now).from.toISOString()).toBe('2026-09-05T03:00:00.000Z');
  });
});
