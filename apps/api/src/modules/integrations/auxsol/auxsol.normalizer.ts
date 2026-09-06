import { NormalizedMonitoringData, NormalizedStatus } from '../integration.contract';
import { stripSensitiveObject } from '../security.redact';
import { AuxsolInvalidPayloadError } from './auxsol.errors';

export type AuxsolFixtureReading = {
  fixture?: string;
  notOfficialContract?: boolean;
  collectedAt?: string;
  device?: {
    externalDeviceId?: string;
    powerW?: number;
    todayEnergyWh?: number;
    totalEnergyWh?: number;
    statusCode?: string;
    voltageV?: number;
    currentA?: number;
    frequencyHz?: number;
    temperatureC?: number;
  } | null;
};

const STATUS_MAP: Record<string, NormalizedStatus> = {
  running: 'ONLINE',
  online: 'ONLINE',
  offline: 'OFFLINE',
  warning: 'WARNING',
  fault: 'ERROR',
  error: 'ERROR',
};

export function normalizeAuxsolStatus(code?: string): NormalizedStatus {
  if (!code) return 'UNKNOWN';
  return STATUS_MAP[code.toLowerCase()] ?? 'UNKNOWN';
}

export function wattsToKw(value?: number) {
  if (value === undefined || value === null) return undefined;
  return Number((value / 1000).toFixed(6));
}

export function wattHoursToKwh(value?: number) {
  if (value === undefined || value === null) return undefined;
  return Number((value / 1000).toFixed(6));
}

export function sanitizeRawPayload(payload: unknown) {
  return stripSensitiveObject(payload);
}

export function normalizeAuxsolFixture(payload: AuxsolFixtureReading, inverterId?: string): NormalizedMonitoringData[] {
  if (!payload || payload.device === undefined) {
    throw new AuxsolInvalidPayloadError();
  }
  if (payload.device === null) return [];

  const device = payload.device;
  const collectedAt = payload.collectedAt ? new Date(payload.collectedAt) : undefined;
  if (payload.collectedAt && (!collectedAt || Number.isNaN(collectedAt.getTime()))) {
    throw new AuxsolInvalidPayloadError('Timestamp da fixture AUXSOL inválido.');
  }

  const status = normalizeAuxsolStatus(device.statusCode);
  return [{
    externalInverterId: device.externalDeviceId,
    collectedAt,
    powerKw: wattsToKw(device.powerW),
    energyTodayKwh: wattHoursToKwh(device.todayEnergyWh),
    energyTotalKwh: wattHoursToKwh(device.totalEnergyWh),
    voltage: device.voltageV,
    current: device.currentA,
    frequency: device.frequencyHz,
    temperature: device.temperatureC,
    acPowerKw: wattsToKw(device.powerW),
    status,
    communicationOk: status !== 'OFFLINE' && status !== 'ERROR',
    rawPayload: sanitizeRawPayload({ ...payload, inverterId }),
  }];
}
