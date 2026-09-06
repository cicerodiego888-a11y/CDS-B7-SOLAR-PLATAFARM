import { toNumber } from './monitoring.aggregation';
import {
  HistoryGranularity,
  bucketKey,
  bucketLabel,
  monitoringTimeZone,
} from './monitoring.timezone';

export type EnergyReading = {
  plantId: string;
  inverterId?: string | null;
  collectedAt: Date;
  energyTotalKwh?: unknown;
  energyTodayKwh?: unknown;
};

export type EnergySource = 'ENERGY_TOTAL' | 'ENERGY_TODAY' | 'NONE';

export type HistorySeriesPoint = {
  label: string;
  bucket: string;
  energyKwh: number;
  collectedAt: string;
};

export function inverterScope(reading: { plantId: string; inverterId?: string | null }) {
  return reading.inverterId || `plant:${reading.plantId}`;
}

export function validEnergy(value: unknown): number | null {
  const number = toNumber(value as never);
  if (number === null || number < 0) return null;
  return number;
}

export function incrementalEnergy(values: Array<{ at: Date; value: number | null }>) {
  const deltas: Array<{ at: Date; kwh: number; reset: boolean }> = [];
  let previous: number | null = null;
  let skippedInvalid = 0;
  for (const item of values) {
    if (item.value === null) {
      skippedInvalid += 1;
      continue;
    }
    if (previous === null) {
      previous = item.value;
      continue;
    }
    if (item.value >= previous) {
      const kwh = item.value - previous;
      if (kwh > 0) deltas.push({ at: item.at, kwh, reset: false });
      previous = item.value;
    } else {
      deltas.push({ at: item.at, kwh: 0, reset: true });
      previous = item.value;
    }
  }
  return {
    deltas,
    resets: deltas.filter((item) => item.reset).length,
    skippedInvalid,
    points: values.filter((item) => item.value !== null).length,
  };
}

export function chooseEnergySource(readings: EnergyReading[]): EnergySource {
  if (readings.some((reading) => validEnergy(reading.energyTotalKwh) !== null)) return 'ENERGY_TOTAL';
  if (readings.some((reading) => validEnergy(reading.energyTodayKwh) !== null)) return 'ENERGY_TODAY';
  return 'NONE';
}

export function aggregateEnergyHistory(
  readings: EnergyReading[],
  options: {
    from: Date;
    to: Date;
    granularity: HistoryGranularity;
    timeZone?: string;
  },
) {
  const timeZone = options.timeZone ?? monitoringTimeZone();
  const grouped = new Map<string, EnergyReading[]>();
  for (const reading of readings) {
    const key = inverterScope(reading);
    const list = grouped.get(key) ?? [];
    list.push(reading);
    grouped.set(key, list);
  }

  const buckets = new Map<string, HistorySeriesPoint>();
  const byPlant = new Map<string, number>();
  const byInverter = new Map<string, number>();
  let energyKwh = 0;
  let hasData = false;
  let resets = 0;
  const sources = new Set<EnergySource>();
  const notes: string[] = [];

  for (const [scope, series] of grouped.entries()) {
    const ordered = [...series].sort((a, b) => a.collectedAt.getTime() - b.collectedAt.getTime());
    const plantId = ordered[0]?.plantId;
    const source = chooseEnergySource(ordered);
    sources.add(source);
    if (source === 'NONE') {
      notes.push('Potência instantânea não é convertida em energia.');
      continue;
    }

    const field = source === 'ENERGY_TOTAL' ? 'energyTotalKwh' : 'energyTodayKwh';
    const values = ordered.map((reading) => ({ at: reading.collectedAt, value: validEnergy(reading[field]) }));
    const result = incrementalEnergy(values);
    resets += result.resets;

    const inRangeDeltas = result.deltas.filter((delta) => (
      delta.at >= options.from && delta.at < options.to && !delta.reset
    ));

    let scopeEnergy = 0;
    if (inRangeDeltas.length) {
      for (const delta of inRangeDeltas) {
        scopeEnergy += delta.kwh;
        addBucket(buckets, delta.at, delta.kwh, options.granularity, timeZone);
      }
    } else if (source === 'ENERGY_TODAY' && result.points === 1) {
      const snapshot = values.find((item) => item.value !== null && item.at >= options.from && item.at < options.to);
      if (snapshot?.value !== null && snapshot?.value !== undefined) {
        scopeEnergy += snapshot.value;
        addBucket(buckets, snapshot.at, snapshot.value, options.granularity, timeZone);
      }
    }

    if (scopeEnergy > 0) {
      energyKwh += scopeEnergy;
      if (plantId) byPlant.set(plantId, (byPlant.get(plantId) ?? 0) + scopeEnergy);
      byInverter.set(scope, (byInverter.get(scope) ?? 0) + scopeEnergy);
    }
  }
  hasData = buckets.size > 0;

  const series = [...buckets.values()].sort((a, b) => a.bucket.localeCompare(b.bucket));
  return {
    hasData,
    energyKwh: hasData ? Number(energyKwh.toFixed(3)) : null,
    series,
    resets,
    source: resolveSources(sources),
    notes: [...new Set(notes)],
    byPlant: Object.fromEntries([...byPlant.entries()].map(([key, value]) => [key, Number(value.toFixed(3))])),
    byInverter: Object.fromEntries([...byInverter.entries()].map(([key, value]) => [key, Number(value.toFixed(3))])),
  };
}

function resolveSources(sources: Set<EnergySource>) {
  const known = [...sources].filter((item) => item !== 'NONE');
  if (!known.length) return 'NONE';
  return known.length === 1 ? known[0] : 'MIXED';
}

function addBucket(
  buckets: Map<string, HistorySeriesPoint>,
  at: Date,
  kwh: number,
  granularity: HistoryGranularity,
  timeZone: string,
) {
  const key = bucketKey(at, granularity, timeZone);
  const current = buckets.get(key);
  if (current) {
    current.energyKwh = Number((current.energyKwh + kwh).toFixed(3));
    return;
  }
  buckets.set(key, {
    label: bucketLabel(at, granularity, timeZone),
    bucket: key,
    energyKwh: Number(kwh.toFixed(3)),
    collectedAt: at.toISOString(),
  });
}
