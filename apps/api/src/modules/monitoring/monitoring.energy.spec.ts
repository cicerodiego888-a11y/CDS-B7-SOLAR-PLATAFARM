import { aggregateEnergyHistory, incrementalEnergy, validEnergy } from './monitoring.energy';
import { buildGenerationSeries } from './monitoring.aggregation';
import { zonedDate } from './monitoring.timezone';

const tz = 'America/Sao_Paulo';

function reading(overrides: Record<string, unknown> = {}) {
  return {
    plantId: 'p1',
    inverterId: 'a',
    collectedAt: new Date('2026-09-05T15:00:00.000Z'),
    ...overrides,
  };
}

describe('Energia incremental', () => {
  it('calcula incremento de energia acumulada 100 → 110 → 120 = 20', () => {
    const result = incrementalEnergy([
      { at: new Date('2026-09-05T10:00:00Z'), value: 100 },
      { at: new Date('2026-09-05T11:00:00Z'), value: 110 },
      { at: new Date('2026-09-05T12:00:00Z'), value: 120 },
    ]);
    expect(result.deltas.filter((item) => !item.reset).reduce((sum, item) => sum + item.kwh, 0)).toBe(20);
  });

  it('não contabiliza reset 100 → 110 → 105 como delta negativo', () => {
    const result = incrementalEnergy([
      { at: new Date('2026-09-05T10:00:00Z'), value: 100 },
      { at: new Date('2026-09-05T11:00:00Z'), value: 110 },
      { at: new Date('2026-09-05T12:00:00Z'), value: 105 },
    ]);
    expect(result.resets).toBe(1);
    expect(result.deltas.filter((item) => !item.reset).reduce((sum, item) => sum + item.kwh, 0)).toBe(10);
  });

  it('ignora leitura inválida e negativa', () => {
    expect(validEnergy(-1)).toBeNull();
    expect(validEnergy(Number.NaN)).toBeNull();
    const result = incrementalEnergy([
      { at: new Date(), value: 100 },
      { at: new Date(), value: null },
      { at: new Date(), value: 112 },
    ]);
    expect(result.skippedInvalid).toBe(1);
    expect(result.deltas[0].kwh).toBe(12);
  });
});

describe('Agregação de histórico', () => {
  const from = new Date('2026-09-05T03:00:00.000Z');
  const to = new Date('2026-09-06T03:00:00.000Z');

  it('histórico vazio não inventa geração', () => {
    const result = aggregateEnergyHistory([], { from, to, granularity: 'HOUR', timeZone: tz });
    expect(result.hasData).toBe(false);
    expect(result.energyKwh).toBeNull();
    expect(result.series).toEqual([]);
  });

  it('uma leitura de energyToday vira snapshot do dia', () => {
    const result = aggregateEnergyHistory([
      reading({ energyTodayKwh: 4.25, collectedAt: new Date('2026-09-05T14:00:00.000Z') }),
    ], { from, to, granularity: 'DAY', timeZone: tz });
    expect(result.energyKwh).toBe(4.25);
  });

  it('várias leituras acumuladas agregam incremento', () => {
    const result = aggregateEnergyHistory([
      reading({ energyTotalKwh: 100, collectedAt: new Date('2026-09-05T12:00:00.000Z') }),
      reading({ energyTotalKwh: 110, collectedAt: new Date('2026-09-05T13:00:00.000Z') }),
      reading({ energyTotalKwh: 120, collectedAt: new Date('2026-09-05T14:00:00.000Z') }),
    ], { from, to, granularity: 'HOUR', timeZone: tz });
    expect(result.energyKwh).toBe(20);
    expect(result.series).toHaveLength(2);
  });

  it('filtra por usina e inversor via agrupamento', () => {
    const result = aggregateEnergyHistory([
      reading({ inverterId: 'a', energyTodayKwh: 100 }),
      reading({ inverterId: 'b', plantId: 'p1', energyTodayKwh: 200, collectedAt: new Date('2026-09-05T14:00:00.000Z') }),
      reading({ inverterId: 'c', plantId: 'p2', energyTodayKwh: 50, collectedAt: new Date('2026-09-05T14:00:00.000Z') }),
    ], { from, to, granularity: 'DAY', timeZone: tz });
    expect(result.byPlant.p1).toBe(300);
    expect(result.byPlant.p2).toBe(50);
    expect(result.energyKwh).toBe(350);
  });

  it('dois inversores somam na usina', () => {
    const result = aggregateEnergyHistory([
      reading({ inverterId: 'a', energyTodayKwh: 100 }),
      reading({ inverterId: 'b', energyTodayKwh: 200, collectedAt: new Date('2026-09-05T14:10:00.000Z') }),
    ], { from, to, granularity: 'DAY', timeZone: tz });
    expect(result.energyKwh).toBe(300);
  });

  it('granularidade HOUR / DAY / MONTH', () => {
    const readings = [
      reading({ energyTotalKwh: 10, collectedAt: new Date('2026-09-05T12:00:00.000Z') }),
      reading({ energyTotalKwh: 12, collectedAt: new Date('2026-09-05T13:30:00.000Z') }),
    ];
    expect(aggregateEnergyHistory(readings, { from, to, granularity: 'HOUR', timeZone: tz }).series[0].label).toMatch(/h$/);
    expect(aggregateEnergyHistory(readings, { from, to, granularity: 'DAY', timeZone: tz }).series).toHaveLength(1);
    const month = aggregateEnergyHistory(readings, {
      from: new Date('2026-09-01T03:00:00.000Z'),
      to: new Date('2026-10-01T03:00:00.000Z'),
      granularity: 'MONTH',
      timeZone: tz,
    });
    expect(month.series[0].bucket).toBe('2026-09');
  });

  it('não soma duplicata do mesmo acumulado', () => {
    const result = aggregateEnergyHistory([
      reading({ energyTotalKwh: 80, collectedAt: new Date('2026-09-05T12:00:00.000Z') }),
      reading({ energyTotalKwh: 80, collectedAt: new Date('2026-09-05T12:05:00.000Z') }),
    ], { from, to, granularity: 'HOUR', timeZone: tz });
    expect(result.energyKwh).toBeNull();
    expect(result.hasData).toBe(false);
  });

  it('não converte potência em energia', () => {
    const result = aggregateEnergyHistory([
      reading({ powerKw: 12, collectedAt: new Date('2026-09-05T14:00:00.000Z') }),
    ] as never, { from, to, granularity: 'HOUR', timeZone: tz });
    expect(result.hasData).toBe(false);
    expect(result.notes.join(' ')).toMatch(/Potência/);
  });

  it('23:30 local permanece no mesmo dia operacional', () => {
    const local = zonedDate(tz, 2026, 9, 5, 23, 30);
    expect(local.toISOString()).toBe('2026-09-06T02:30:00.000Z');
    const result = aggregateEnergyHistory([
      reading({ energyTodayKwh: 8, collectedAt: local }),
    ], {
      from: zonedDate(tz, 2026, 9, 5, 0, 0),
      to: zonedDate(tz, 2026, 9, 6, 0, 0),
      granularity: 'DAY',
      timeZone: tz,
    });
    expect(result.hasData).toBe(true);
    expect(result.series[0].bucket).toBe('2026-09-05');
  });

  it('Dashboard e History usam a mesma regra', () => {
    const readings = [
      reading({ energyTotalKwh: 100, collectedAt: new Date('2026-09-05T12:00:00.000Z') }),
      reading({ energyTotalKwh: 130, collectedAt: new Date('2026-09-05T18:00:00.000Z') }),
    ];
    process.env.MONITORING_TIMEZONE = tz;
    const series = buildGenerationSeries(readings, 'today', new Date('2026-09-05T20:00:00.000Z'));
    const history = aggregateEnergyHistory(readings, {
      from: zonedDate(tz, 2026, 9, 5),
      to: zonedDate(tz, 2026, 9, 6),
      granularity: 'HOUR',
      timeZone: tz,
    });
    expect(series.reduce((sum, item) => sum + item.valueKwh, 0)).toBe(history.energyKwh);
  });
});
