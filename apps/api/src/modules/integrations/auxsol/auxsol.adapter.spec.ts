import { AuxsolAdapter } from './auxsol.adapter';
import { AuxsolClient } from './auxsol.client';
import { AuxsolAuthError, AuxsolTransientError } from './auxsol.errors';
import { AUXSOL_FIXTURE_EMPTY, AUXSOL_FIXTURE_INVALID, AUXSOL_FIXTURE_OFFLINE, AUXSOL_FIXTURE_VALID } from './auxsol.fixtures';
import { MockAuxsolTransport } from './auxsol.transport';

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
});
