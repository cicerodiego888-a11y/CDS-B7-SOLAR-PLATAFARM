import { NormalizedMonitoringData } from './integration.contract';

/** Fixture do contrato interno. Não persistir automaticamente. Não usar no Dashboard. */
export const INTERNAL_NORMALIZED_READING: NormalizedMonitoringData = {
  externalInverterId: 'device-001',
  collectedAt: new Date('2026-09-05T15:00:00.000Z'),
  status: 'ONLINE',
  powerKw: 12.4,
  energyTotalKwh: 15342.8,
  energyTodayKwh: 84.2,
  communicationOk: true,
};

export const INTERNAL_READING_OPTIONAL_MISSING: NormalizedMonitoringData = {
  collectedAt: new Date('2026-09-05T15:00:00.000Z'),
  communicationOk: true,
};
