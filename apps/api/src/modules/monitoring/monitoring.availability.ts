export const DEFAULT_AVAILABILITY_MAX_GAP_SECONDS = 900;
export const LOW_COVERAGE_PERCENT = 50;

export type ObservedStatus = 'ONLINE' | 'WARNING' | 'OFFLINE' | 'ERROR' | 'UNKNOWN';
export type AvailabilityReason =
  | 'OK'
  | 'NO_DATA'
  | 'INTEGRATION_BLOCKED'
  | 'INTEGRATION_NOT_CONFIGURED'
  | 'NOT_SUPPORTED'
  | 'INACTIVE'
  | 'NO_ELIGIBLE_INVERTERS';
export type OperationalHealth = 'HEALTHY' | 'ATTENTION' | 'CRITICAL' | 'NO_DATA';

export type AvailabilityReading = {
  collectedAt: Date;
  status?: string | null;
  communicationOk?: boolean | null;
  powerKw?: number | null;
};

export type InverterAvailability = {
  inverterId: string;
  plantId?: string;
  period: string;
  timezone: string;
  from: string;
  to: string;
  observedSeconds: number;
  unobservedSeconds: number;
  onlineSeconds: number;
  warningSeconds: number;
  offlineSeconds: number;
  errorSeconds: number;
  unknownSeconds: number;
  periodSeconds: number;
  availabilityPercent: number | null;
  coveragePercent: number;
  status: AvailabilityReason;
  reason: AvailabilityReason;
  health: OperationalHealth;
  lastObservedStatus: ObservedStatus | null;
};

export function availabilityMaxGapSeconds() {
  const parsed = Number(process.env.MONITORING_AVAILABILITY_MAX_GAP_SECONDS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_AVAILABILITY_MAX_GAP_SECONDS;
}

export function extractStoredStatus(rawPayload: unknown): string | undefined {
  if (!rawPayload || typeof rawPayload !== 'object') return undefined;
  const row = rawPayload as Record<string, unknown>;
  if (typeof row.normalizedStatus === 'string') return row.normalizedStatus;
  if (typeof row.status === 'string' && /^(ONLINE|OFFLINE|WARNING|ERROR|UNKNOWN)$/i.test(row.status)) {
    return row.status;
  }
  return undefined;
}

export function resolveObservedStatus(reading: AvailabilityReading): ObservedStatus {
  const status = reading.status?.toUpperCase();
  if (status === 'ONLINE' || status === 'WARNING' || status === 'OFFLINE' || status === 'ERROR' || status === 'UNKNOWN') {
    return status;
  }
  if (reading.communicationOk === false) return 'ERROR';
  return 'ONLINE';
}

export function roundPercent(value: number) {
  return Number(value.toFixed(1));
}

export function calculateInverterAvailability(input: {
  inverterId: string;
  plantId?: string;
  period: string;
  timezone: string;
  from: Date;
  to: Date;
  readings: AvailabilityReading[];
  maxGapSeconds?: number;
  now?: Date;
  collectability?: 'COLLECTABLE' | 'BLOCKED' | 'NOT_CONFIGURED' | 'NOT_SUPPORTED';
  inverterStatus?: string | null;
  hasCriticalEquipmentAlert?: boolean;
  hasWarningAlert?: boolean;
}): InverterAvailability {
  const collectability = input.collectability ?? 'COLLECTABLE';
  const blockedReason = resolveEligibilityReason(collectability, input.inverterStatus);
  const horizon = availabilityHorizon(input.from, input.to, input.now ?? new Date());
  const periodSeconds = Math.max(0, Math.round((horizon.getTime() - input.from.getTime()) / 1000));
  const empty = emptyAvailability({
    inverterId: input.inverterId,
    plantId: input.plantId,
    period: input.period,
    timezone: input.timezone,
    from: input.from,
    to: input.to,
    periodSeconds,
    reason: blockedReason ?? 'NO_DATA',
  });

  if (blockedReason) return empty;

  const buckets = observeReadings(input.readings, input.from, horizon, input.maxGapSeconds ?? availabilityMaxGapSeconds());
  const observedSeconds = buckets.ONLINE + buckets.WARNING + buckets.OFFLINE + buckets.ERROR + buckets.UNKNOWN;
  const evidenceSeconds = buckets.ONLINE + buckets.WARNING + buckets.OFFLINE + buckets.ERROR;
  const availabilityPercent = evidenceSeconds > 0
    ? roundPercent(((buckets.ONLINE + buckets.WARNING) / evidenceSeconds) * 100)
    : null;
  const coveragePercent = periodSeconds > 0 ? roundPercent((observedSeconds / periodSeconds) * 100) : 0;
  const lastObservedStatus = lastStatusInPeriod(input.readings, input.from, input.to);
  const reason: AvailabilityReason = evidenceSeconds > 0 ? 'OK' : 'NO_DATA';
  const health = classifyHealth({
    reason,
    evidenceSeconds,
    coveragePercent,
    warningSeconds: buckets.WARNING,
    offlineSeconds: buckets.OFFLINE,
    errorSeconds: buckets.ERROR,
    hasCriticalEquipmentAlert: Boolean(input.hasCriticalEquipmentAlert),
    hasWarningAlert: Boolean(input.hasWarningAlert),
  });

  return {
    inverterId: input.inverterId,
    plantId: input.plantId,
    period: input.period,
    timezone: input.timezone,
    from: input.from.toISOString(),
    to: input.to.toISOString(),
    observedSeconds,
    unobservedSeconds: buckets.UNOBSERVED,
    onlineSeconds: buckets.ONLINE,
    warningSeconds: buckets.WARNING,
    offlineSeconds: buckets.OFFLINE,
    errorSeconds: buckets.ERROR,
    unknownSeconds: buckets.UNKNOWN,
    periodSeconds,
    availabilityPercent,
    coveragePercent,
    status: reason,
    reason,
    health,
    lastObservedStatus,
  };
}

export function aggregatePlantAvailability(input: {
  plantId: string;
  period: string;
  timezone: string;
  from: Date;
  to: Date;
  inverters: InverterAvailability[];
}): InverterAvailability & {
  eligibleInverters: number;
  observedInverters: number;
  invertersWithoutData: number;
} {
  const eligible = input.inverters.filter((item) => item.reason !== 'INTEGRATION_BLOCKED'
    && item.reason !== 'INTEGRATION_NOT_CONFIGURED'
    && item.reason !== 'NOT_SUPPORTED'
    && item.reason !== 'INACTIVE');
  const periodSeconds = eligible.reduce((sum, item) => sum + item.periodSeconds, 0);
  const observedSeconds = eligible.reduce((sum, item) => sum + item.observedSeconds, 0);
  const onlineSeconds = eligible.reduce((sum, item) => sum + item.onlineSeconds, 0);
  const warningSeconds = eligible.reduce((sum, item) => sum + item.warningSeconds, 0);
  const offlineSeconds = eligible.reduce((sum, item) => sum + item.offlineSeconds, 0);
  const errorSeconds = eligible.reduce((sum, item) => sum + item.errorSeconds, 0);
  const unknownSeconds = eligible.reduce((sum, item) => sum + item.unknownSeconds, 0);
  const evidenceSeconds = onlineSeconds + warningSeconds + offlineSeconds + errorSeconds;
  const reason: AvailabilityReason = !eligible.length
    ? 'NO_ELIGIBLE_INVERTERS'
    : evidenceSeconds > 0 ? 'OK' : 'NO_DATA';
  const coveragePercent = periodSeconds > 0 ? roundPercent((observedSeconds / periodSeconds) * 100) : 0;
  const health = !eligible.length
    ? 'NO_DATA'
    : worstHealth(eligible.map((item) => item.health), evidenceSeconds > 0);

  return {
    inverterId: input.plantId,
    plantId: input.plantId,
    period: input.period,
    timezone: input.timezone,
    from: input.from.toISOString(),
    to: input.to.toISOString(),
    observedSeconds,
    unobservedSeconds: eligible.reduce((sum, item) => sum + item.unobservedSeconds, 0),
    onlineSeconds,
    warningSeconds,
    offlineSeconds,
    errorSeconds,
    unknownSeconds,
    periodSeconds,
    availabilityPercent: evidenceSeconds > 0 ? roundPercent(((onlineSeconds + warningSeconds) / evidenceSeconds) * 100) : null,
    coveragePercent,
    status: reason,
    reason,
    health,
    lastObservedStatus: null,
    eligibleInverters: eligible.length,
    observedInverters: eligible.filter((item) => item.observedSeconds > 0).length,
    invertersWithoutData: eligible.filter((item) => item.reason === 'NO_DATA').length,
  };
}

export function classifyHealth(input: {
  reason: AvailabilityReason;
  evidenceSeconds: number;
  coveragePercent: number;
  warningSeconds: number;
  offlineSeconds: number;
  errorSeconds: number;
  hasCriticalEquipmentAlert: boolean;
  hasWarningAlert: boolean;
}): OperationalHealth {
  if (
    input.reason === 'INTEGRATION_BLOCKED'
    || input.reason === 'INTEGRATION_NOT_CONFIGURED'
    || input.reason === 'NOT_SUPPORTED'
    || input.reason === 'INACTIVE'
    || input.reason === 'NO_ELIGIBLE_INVERTERS'
  ) {
    return 'NO_DATA';
  }
  if (input.hasCriticalEquipmentAlert || input.offlineSeconds > 0 || input.errorSeconds > 0) return 'CRITICAL';
  if (input.evidenceSeconds <= 0) return 'NO_DATA';
  if (input.warningSeconds > 0 || input.hasWarningAlert || input.coveragePercent < LOW_COVERAGE_PERCENT) return 'ATTENTION';
  return 'HEALTHY';
}

function resolveEligibilityReason(
  collectability: 'COLLECTABLE' | 'BLOCKED' | 'NOT_CONFIGURED' | 'NOT_SUPPORTED',
  inverterStatus?: string | null,
): AvailabilityReason | null {
  if (inverterStatus === 'INACTIVE') return 'INACTIVE';
  if (collectability === 'BLOCKED') return 'INTEGRATION_BLOCKED';
  if (collectability === 'NOT_CONFIGURED') return 'INTEGRATION_NOT_CONFIGURED';
  if (collectability === 'NOT_SUPPORTED') return 'NOT_SUPPORTED';
  return null;
}

function availabilityHorizon(from: Date, to: Date, now: Date) {
  if (to.getTime() > now.getTime()) {
    return now.getTime() > from.getTime() ? now : from;
  }
  return to;
}

function observeReadings(readings: AvailabilityReading[], from: Date, horizon: Date, maxGapSeconds: number) {
  const buckets = { ONLINE: 0, WARNING: 0, OFFLINE: 0, ERROR: 0, UNKNOWN: 0, UNOBSERVED: 0 };
  const start = from.getTime();
  const end = horizon.getTime();
  const maxGapMs = maxGapSeconds * 1000;
  if (end <= start) return buckets;

  const points = uniqueReadings(readings)
    .filter((reading) => {
      const time = reading.collectedAt.getTime();
      return Number.isFinite(time) && time >= start && time < end;
    })
    .sort((a, b) => a.collectedAt.getTime() - b.collectedAt.getTime())
    .map((reading) => ({
      at: reading.collectedAt.getTime(),
      status: resolveObservedStatus(reading),
    }));

  if (!points.length) {
    buckets.UNOBSERVED = secondsBetween(start, end);
    return buckets;
  }

  addBucket(buckets, 'UNOBSERVED', secondsBetween(start, points[0].at));
  for (let index = 0; index < points.length; index += 1) {
    const next = index + 1 < points.length ? points[index + 1].at : end;
    const delta = next - points[index].at;
    if (delta <= 0) continue;
    const observed = Math.min(delta, maxGapMs);
    addBucket(buckets, points[index].status, observed / 1000);
    if (delta > maxGapMs) addBucket(buckets, 'UNOBSERVED', (delta - maxGapMs) / 1000);
  }
  return buckets;
}

function uniqueReadings(readings: AvailabilityReading[]) {
  const byTime = new Map<number, AvailabilityReading>();
  for (const reading of readings) {
    const time = reading.collectedAt?.getTime();
    if (!Number.isFinite(time)) continue;
    byTime.set(time, reading);
  }
  return [...byTime.values()];
}

function lastStatusInPeriod(readings: AvailabilityReading[], from: Date, to: Date): ObservedStatus | null {
  const inRange = readings
    .filter((reading) => reading.collectedAt >= from && reading.collectedAt < to)
    .sort((a, b) => a.collectedAt.getTime() - b.collectedAt.getTime());
  return inRange.length ? resolveObservedStatus(inRange[inRange.length - 1]) : null;
}

function addBucket(
  buckets: Record<ObservedStatus | 'UNOBSERVED', number>,
  key: ObservedStatus | 'UNOBSERVED',
  seconds: number,
) {
  buckets[key] += Math.max(0, seconds);
}

function secondsBetween(fromMs: number, toMs: number) {
  return Math.max(0, (toMs - fromMs) / 1000);
}

function emptyAvailability(input: {
  inverterId: string;
  plantId?: string;
  period: string;
  timezone: string;
  from: Date;
  to: Date;
  periodSeconds: number;
  reason: AvailabilityReason;
}): InverterAvailability {
  return {
    inverterId: input.inverterId,
    plantId: input.plantId,
    period: input.period,
    timezone: input.timezone,
    from: input.from.toISOString(),
    to: input.to.toISOString(),
    observedSeconds: 0,
    unobservedSeconds: input.periodSeconds,
    onlineSeconds: 0,
    warningSeconds: 0,
    offlineSeconds: 0,
    errorSeconds: 0,
    unknownSeconds: 0,
    periodSeconds: input.periodSeconds,
    availabilityPercent: null,
    coveragePercent: 0,
    status: input.reason,
    reason: input.reason,
    health: 'NO_DATA',
    lastObservedStatus: null,
  };
}

function worstHealth(values: OperationalHealth[], hasEvidence: boolean): OperationalHealth {
  if (values.includes('CRITICAL')) return 'CRITICAL';
  if (values.includes('ATTENTION')) return 'ATTENTION';
  if (values.includes('HEALTHY')) return hasEvidence && values.includes('NO_DATA') ? 'ATTENTION' : 'HEALTHY';
  return 'NO_DATA';
}
