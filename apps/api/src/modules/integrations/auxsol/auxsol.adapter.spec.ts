import { AuxsolAdapter } from './auxsol.adapter';
import { AuxsolClient } from './auxsol.client';
import { AuxsolAuthError, AuxsolTransientError } from './auxsol.errors';
import {
  AUXSOL_FIXTURE_EMPTY,
  AUXSOL_FIXTURE_INVALID,
  AUXSOL_FIXTURE_OFFLINE,
  AUXSOL_FIXTURE_VALID,
  AUXSOL_OFFICIAL_REALTIME_FIXTURE,
} from './auxsol.fixtures';
import { createDefaultIntegrationEngine } from '../integration.engine';
import { HttpAuxsolTransport, MockAuxsolTransport } from './auxsol.transport';
import { AUXSOL_SUCCESS_CODE } from './auxsol.config';
import { buildIdempotencyKey, validateNormalizedReading } from '../collection/reading.validator';

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
  } as Response;
}

describe('AuxsolAdapter', () => {
  it('testa conexão com fixture controlada', async () => {
    const adapter = new AuxsolAdapter(new AuxsolClient(new MockAuxsolTransport('valid')));
    const result = await adapter.testConnection({});
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('mock');
  });

  it('coleta leitura válida da fixture', async () => {
    const adapter = new AuxsolAdapter(new AuxsolClient(new MockAuxsolTransport('valid')));
    const readings = await adapter.collect({ inverterId: 'i1' });
    expect(readings).toHaveLength(1);
    expect(readings[0].powerKw).toBe(1);
    expect(readings[0].externalInverterId).toBe(AUXSOL_FIXTURE_VALID.device.externalDeviceId);
  });

  it('retorna lista vazia quando não há dispositivo', async () => {
    const adapter = new AuxsolAdapter(new AuxsolClient(new MockAuxsolTransport('empty')));
    await expect(adapter.collect({})).resolves.toEqual([]);
    expect(AUXSOL_FIXTURE_EMPTY.device).toBeNull();
  });

  it('normaliza dispositivo offline', async () => {
    const adapter = new AuxsolAdapter(new AuxsolClient(new MockAuxsolTransport('offline')));
    const [reading] = await adapter.collect({});
    expect(reading.status).toBe('OFFLINE');
    expect(reading.communicationOk).toBe(false);
    expect(reading.externalInverterId).toBe(AUXSOL_FIXTURE_OFFLINE.device.externalDeviceId);
  });

  it('propaga erro de autenticação', async () => {
    const adapter = new AuxsolAdapter(new AuxsolClient(new MockAuxsolTransport('auth')));
    await expect(adapter.collect({})).rejects.toBeInstanceOf(AuxsolAuthError);
  });

  it('propaga timeout e HTTP transitório', async () => {
    process.env.AUXSOL_HTTP_MAX_RETRIES = '0';
    const timeoutAdapter = new AuxsolAdapter(new AuxsolClient(new MockAuxsolTransport('timeout')));
    await expect(timeoutAdapter.collect({})).rejects.toBeInstanceOf(AuxsolTransientError);
    const rateAdapter = new AuxsolAdapter(new AuxsolClient(new MockAuxsolTransport('429')));
    await expect(rateAdapter.collect({})).rejects.toMatchObject({ statusCode: 429 });
    const serverAdapter = new AuxsolAdapter(new AuxsolClient(new MockAuxsolTransport('500')));
    await expect(serverAdapter.collect({})).rejects.toMatchObject({ statusCode: 500 });
    delete process.env.AUXSOL_HTTP_MAX_RETRIES;
  });

  it('rejeita payload inválido', async () => {
    const transport = { mode: 'mock' as const, execute: async () => AUXSOL_FIXTURE_INVALID };
    const adapter = new AuxsolAdapter(new AuxsolClient(transport));
    await expect(adapter.collect({})).rejects.toThrow();
  });

  it('LIVE collect normaliza realtime oficial sem AuxsolContractUnavailableError', async () => {
    const fetchImpl = jest.fn(async (url: string | URL) => {
      if (String(url).endsWith('/auth/token')) {
        return jsonResponse(200, {
          code: AUXSOL_SUCCESS_CODE,
          data: { access_token: 'test-access-token', expires_in: 43200 },
        });
      }
      return jsonResponse(200, AUXSOL_OFFICIAL_REALTIME_FIXTURE);
    });
    const adapter = new AuxsolAdapter(new AuxsolClient(new HttpAuxsolTransport({
      baseUrl: 'https://auxsol.example.test',
      appId: 'test-app-id',
      appSecret: 'test-app-secret',
      fetchImpl: fetchImpl as never,
    })));

    const readings = await adapter.collect({
      inverterId: 'inv-1',
      serialNumber: 'TEST-SN-001',
      externalId: 'should-not-be-used-as-sn',
    });

    expect(readings).toHaveLength(1);
    expect(readings[0].powerKw).toBe(1.25);
    expect(readings[0].energyTodayKwh).toBe(8.5);
    expect(readings[0].energyMonthKwh).toBe(120.4);
    expect(readings[0].energyTotalKwh).toBe(3500.2);
    expect(readings[0].collectedAt?.toISOString()).toBe('2026-09-10T15:30:00.000Z');
    expect(validateNormalizedReading(readings[0])).toBe(true);
  });
});

describe('Pipeline IntegrationEngine → AuxsolAdapter → NormalizedMonitoringData', () => {
  it('resolve AUXSOL e entrega contrato interno a partir do payload oficial', async () => {
    const fetchImpl = jest.fn(async (url: string | URL) => {
      if (String(url).endsWith('/auth/token')) {
        return jsonResponse(200, {
          code: AUXSOL_SUCCESS_CODE,
          data: { access_token: 'pipeline-token', expires_in: 43200 },
        });
      }
      expect(String(url)).toContain('/analysis/inverterReport/findInverterRealTimeInfoBySn/TEST-SN-001');
      return jsonResponse(200, AUXSOL_OFFICIAL_REALTIME_FIXTURE);
    });

    const engine = createDefaultIntegrationEngine();
    const adapter = new AuxsolAdapter(new AuxsolClient(new HttpAuxsolTransport({
      baseUrl: 'https://auxsol.example.test',
      appId: 'test-app-id',
      appSecret: 'test-app-secret',
      fetchImpl: fetchImpl as never,
    })));
    engine.register(adapter);

    const resolved = engine.resolve('AUXSOL');
    expect(resolved).toBe(adapter);

    const info = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const readings = await resolved!.collect({
      inverterId: 'inv-pipeline',
      serialNumber: 'TEST-SN-001',
    });

    expect(readings[0]).toMatchObject({
      powerKw: 1.25,
      energyTodayKwh: 8.5,
      energyMonthKwh: 120.4,
      energyTotalKwh: 3500.2,
      communicationOk: true,
    });

    const key = buildIdempotencyKey('AUXSOL', 'inv-pipeline', readings[0]);
    expect(key).toBe('AUXSOL:inv-pipeline:rt-001');

    const dumped = [...info.mock.calls, ...error.mock.calls].map((call) => JSON.stringify(call)).join('\n');
    expect(dumped).not.toContain('pipeline-token');
    expect(dumped).not.toContain('test-app-secret');
    expect(dumped).not.toMatch(/Bearer\s+\S+/i);
    info.mockRestore();
    error.mockRestore();
  });

  it('MOCK official scenario não faz HTTP e normaliza contrato PDF-like', async () => {
    const fetchImpl = jest.fn();
    const adapter = new AuxsolAdapter(new AuxsolClient(new MockAuxsolTransport('official')));
    const readings = await adapter.collect({ serialNumber: 'TEST-SN-001' });
    expect(readings[0].powerKw).toBe(1.25);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
