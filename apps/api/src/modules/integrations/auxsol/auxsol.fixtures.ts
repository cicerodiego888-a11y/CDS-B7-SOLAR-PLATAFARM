/**
 * Fixtures INTERNAS da B7 para testes do adapter.
 * Não representam o contrato oficial da AUXSOL.
 * Campo `notOfficialContract` deixa isso explícito.
 */
export const AUXSOL_FIXTURE_VALID = {
  fixture: 'b7-internal-auxsol-fixture',
  notOfficialContract: true,
  collectedAt: '2026-09-05T12:00:00.000Z',
  device: {
    externalDeviceId: 'AUXSOL-DEVICE-001',
    powerW: 1000,
    todayEnergyWh: 2500,
    totalEnergyWh: 180000,
    statusCode: 'running',
    voltageV: 220,
    currentA: 4.5,
    frequencyHz: 60,
  },
};

export const AUXSOL_FIXTURE_EMPTY = {
  fixture: 'b7-internal-auxsol-fixture',
  notOfficialContract: true,
  device: null,
};

export const AUXSOL_FIXTURE_OFFLINE = {
  fixture: 'b7-internal-auxsol-fixture',
  notOfficialContract: true,
  collectedAt: '2026-09-05T12:00:00.000Z',
  device: {
    externalDeviceId: 'AUXSOL-DEVICE-002',
    statusCode: 'offline',
  },
};

export const AUXSOL_FIXTURE_OPTIONAL_MISSING = {
  fixture: 'b7-internal-auxsol-fixture',
  notOfficialContract: true,
  collectedAt: '2026-09-05T15:30:00.000Z',
  device: {
    externalDeviceId: 'AUXSOL-DEVICE-003',
    powerW: 0,
    statusCode: 'running',
  },
};

export const AUXSOL_FIXTURE_INVALID = {
  notOfficialContract: true,
  unexpected: true,
};
