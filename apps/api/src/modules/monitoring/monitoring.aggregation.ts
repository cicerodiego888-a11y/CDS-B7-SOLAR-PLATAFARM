import { getInverterManufacturerName } from '../integrations/manufacturers.catalog';
import { aggregateEnergyHistory } from './monitoring.energy';
import {
  HistoryPeriod,
  defaultGranularity,
  monitoringTimeZone,
  periodRange as zonedPeriodRange,
} from './monitoring.timezone';

export type DashboardPeriod = Exclude<HistoryPeriod, 'custom'>;

export type OperationalStatus = 'ONLINE' | 'OFFLINE' | 'WARNING' | 'ERROR' | 'UNKNOWN';

type Numeric = number | { toNumber?: () => number } | null | undefined;

export function toNumber(value: Numeric): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value.toNumber === 'function') return value.toNumber();
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function startOfDay(date: Date) {
  return zonedPeriodRange('today', date).from;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function periodRange(period: DashboardPeriod | HistoryPeriod, now = new Date()) {
  return zonedPeriodRange(period, now, monitoringTimeZone());
}

export function resolveOperationalStatus(plantStatus: string, communicationOk?: boolean | null): OperationalStatus {
  if (plantStatus === 'OFFLINE') return 'OFFLINE';
  if (plantStatus === 'WARNING') return 'WARNING';
  if (plantStatus === 'INACTIVE') return 'UNKNOWN';
  if (communicationOk === false) return 'ERROR';
  if (plantStatus === 'ACTIVE') return 'ONLINE';
  return 'UNKNOWN';
}

export function latestReadingByKey<T extends { plantId: string; inverterId?: string | null; collectedAt: Date }>(
  readings: T[],
) {
  const latest = new Map<string, T>();
  for (const reading of readings) {
    const key = reading.inverterId || `plant:${reading.plantId}`;
    const current = latest.get(key);
    if (!current || current.collectedAt < reading.collectedAt) {
      latest.set(key, reading);
    }
  }
  return [...latest.values()];
}

export function comparisonPercent(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

export function buildGenerationSeries(
  readings: Array<{ plantId: string; inverterId?: string | null; collectedAt: Date; energyTodayKwh?: Numeric; energyTotalKwh?: Numeric }>,
  period: DashboardPeriod,
  now = new Date(),
) {
  const { from, to } = periodRange(period, now);
  return aggregateEnergyHistory(readings, {
    from,
    to,
    granularity: defaultGranularity(period, from, to),
    timeZone: monitoringTimeZone(),
  }).series.map((point) => ({
    label: point.label,
    valueKwh: point.energyKwh,
    collectedAt: point.collectedAt,
  }));
}

export function manufacturerLabelFromInverters(inverters: Array<{ manufacturer: string }>) {
  const first = inverters[0];
  return first ? getInverterManufacturerName(first.manufacturer) : null;
}
