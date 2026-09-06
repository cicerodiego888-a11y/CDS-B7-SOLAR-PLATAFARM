import { AUXSOL_FIXTURE_OPTIONAL_MISSING, AUXSOL_FIXTURE_VALID } from './auxsol.fixtures';
import { normalizeAuxsolFixture, normalizeAuxsolStatus, wattHoursToKwh, wattsToKw } from './auxsol.normalizer';
import { AuxsolInvalidPayloadError } from './auxsol.errors';

describe('Normalização AUXSOL (fixtures internas)', () => {
  it('converte 1000 W em 1 kW quando a fixture documenta W', () => {
    expect(wattsToKw(1000)).toBe(1);
    expect(wattHoursToKwh(2500)).toBe(2.5);
  });

  it('mapeia status do fabricante para o enum interno', () => {
    expect(normalizeAuxsolStatus('running')).toBe('ONLINE');
    expect(normalizeAuxsolStatus('offline')).toBe('OFFLINE');
    expect(normalizeAuxsolStatus('warning')).toBe('WARNING');
    expect(normalizeAuxsolStatus('fault')).toBe('ERROR');
    expect(normalizeAuxsolStatus('desconhecido')).toBe('UNKNOWN');
    expect(normalizeAuxsolStatus()).toBe('UNKNOWN');
  });

  it('normaliza leitura válida sem inventar campos', () => {
    const [reading] = normalizeAuxsolFixture(AUXSOL_FIXTURE_VALID, 'inv-1');
    expect(reading.externalInverterId).toBe('AUXSOL-DEVICE-001');
    expect(reading.powerKw).toBe(1);
    expect(reading.energyTodayKwh).toBe(2.5);
    expect(reading.energyTotalKwh).toBe(180);
    expect(reading.status).toBe('ONLINE');
    expect(reading.collectedAt?.toISOString()).toBe('2026-09-05T12:00:00.000Z');
    expect(reading.temperature).toBeUndefined();
  });

  it('mantém campos opcionais ausentes como indefinidos', () => {
    const [reading] = normalizeAuxsolFixture(AUXSOL_FIXTURE_OPTIONAL_MISSING);
    expect(reading.energyTodayKwh).toBeUndefined();
    expect(reading.voltage).toBeUndefined();
    expect(reading.temperature).toBeUndefined();
  });

  it('rejeita payload inválido', () => {
    expect(() => normalizeAuxsolFixture({} as never)).toThrow(AuxsolInvalidPayloadError);
  });
});
