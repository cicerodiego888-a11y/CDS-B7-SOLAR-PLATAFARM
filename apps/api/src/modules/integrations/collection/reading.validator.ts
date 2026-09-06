import { NormalizedMonitoringData, NormalizedStatus } from '../integration.contract';
import { stripSensitiveObject } from '../security.redact';

const STATUSES: NormalizedStatus[] = ['ONLINE', 'OFFLINE', 'WARNING', 'ERROR', 'UNKNOWN'];
const FUTURE_TOLERANCE_MS = 7 * 24 * 60 * 60 * 1000;

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isValidNumericField(value: unknown, allowNegative = false) {
  if (value === undefined || value === null) return true;
  if (!isFiniteNumber(value)) return false;
  if (!allowNegative && value < 0) return false;
  return true;
}

export function isValidTimestamp(value?: Date) {
  if (!value) return false;
  const time = value.getTime();
  if (!Number.isFinite(time)) return false;
  if (time > Date.now() + FUTURE_TOLERANCE_MS) return false;
  return true;
}

/** Instantâneo UTC. Timezone do fabricante deve ser convertido no adapter. Não inventar Date.now(). */

export function validateNormalizedReading(reading: NormalizedMonitoringData) {
  if (!isValidTimestamp(reading.collectedAt)) return false;
  if (reading.status && !STATUSES.includes(reading.status)) return false;
  if (!isValidNumericField(reading.powerKw)) return false;
  if (!isValidNumericField(reading.energyTodayKwh)) return false;
  if (!isValidNumericField(reading.energyMonthKwh)) return false;
  if (!isValidNumericField(reading.energyTotalKwh)) return false;
  if (!isValidNumericField(reading.voltage)) return false;
  if (!isValidNumericField(reading.current)) return false;
  if (!isValidNumericField(reading.frequency)) return false;
  if (!isValidNumericField(reading.temperature, true)) return false;
  if (!isValidNumericField(reading.dcPowerKw)) return false;
  if (!isValidNumericField(reading.acPowerKw)) return false;
  return true;
}

export function sanitizeRawPayload(payload: unknown) {
  return stripSensitiveObject(payload);
}

export function buildIdempotencyKey(provider: string, inverterId: string, reading: NormalizedMonitoringData) {
  if (reading.externalReadingId) {
    return `${provider}:${inverterId}:${reading.externalReadingId}`;
  }
  if (reading.collectedAt) {
    return `${provider}:${inverterId}:${reading.collectedAt.toISOString()}`;
  }
  return undefined;
}
