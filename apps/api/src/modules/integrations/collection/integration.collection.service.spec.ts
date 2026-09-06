import { NotFoundException } from '@nestjs/common';
import { IntegrationEngine } from '../integration.engine';
import { CollectionError } from './collection.errors';
import { IntegrationCollectionService } from './integration.collection.service';

function inverter(overrides: Record<string, unknown> = {}) {
  return {
    id: 'i1',
    plantId: 'p1',
    manufacturer: 'AUXSOL',
    manufacturerRef: { code: 'AUXSOL' },
    serialNumber: 'SN1',
    externalId: 'ext-1',
    bindings: [{ id: 'b1', provider: 'AUXSOL', externalId: 'ext-1', lastSyncAt: null }],
    ...overrides,
  };
}

function adapter(overrides: Record<string, unknown> = {}) {
  return {
    provider: 'AUXSOL',
    capabilities: () => ['testConnection', 'collect'],
    runtimeState: () => ({ mode: 'blocked', persistable: false, available: true }),
    testConnection: async () => ({ ok: false, supported: false, mode: 'blocked', message: 'blocked' }),
    collect: async () => [],
    ...overrides,
  };
}

describe('IntegrationCollectionService', () => {
  function setup(adapterImpl: ReturnType<typeof adapter>, inverterValue: unknown = inverter()) {
    const prisma = {
      inverter: { findUnique: jest.fn().mockResolvedValue(inverterValue) },
      integrationBinding: { update: jest.fn().mockResolvedValue({}) },
    };
    const persistence = { persist: jest.fn().mockResolvedValue({ persisted: 1, skipped: 0, valid: 1 }) };
    const engine = new IntegrationEngine().register(adapterImpl as never);
    const service = new IntegrationCollectionService(prisma as never, persistence as never).useEngine(engine);
    return { service, prisma, persistence };
  }

  it('retorna 404 quando o inversor não existe', async () => {
    const { service } = setup(adapter(), null);
    await expect(service.collectInverter('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('bloqueia inversor sem binding', async () => {
    const { service } = setup(adapter(), inverter({ bindings: [] }));
    await expect(service.collectInverter('i1')).rejects.toMatchObject({ code: 'INTEGRATION_NOT_CONFIGURED' });
  });

  it('bloqueia fabricante sem adapter disponível', async () => {
    const { service } = setup(adapter({
      provider: 'DEYE',
      runtimeState: () => ({ mode: 'blocked', persistable: false, available: false }),
    }), inverter({ manufacturer: 'DEYE', manufacturerRef: { code: 'DEYE' }, bindings: [{ id: 'b2', provider: 'DEYE' }] }));
    await expect(service.collectInverter('i1')).rejects.toMatchObject({ code: 'INTEGRATION_NOT_SUPPORTED' });
  });

  it('trata AUXSOL blocked sem persistir', async () => {
    const { service, persistence } = setup(adapter());
    await expect(service.collectInverter('i1')).rejects.toBeInstanceOf(CollectionError);
    expect(persistence.persist).not.toHaveBeenCalled();
  });

  it('executa mock sem persistir e sem lastSyncAt', async () => {
    const { service, persistence, prisma } = setup(adapter({
      runtimeState: () => ({ mode: 'mock', persistable: false, available: true }),
      collect: async () => [{
        collectedAt: new Date('2026-09-05T12:00:00.000Z'),
        communicationOk: true,
        powerKw: 1,
      }],
    }));
    const result = await service.collectInverter('i1');
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('mock');
    expect(result.persisted).toBe(0);
    expect(result.lastSyncAt).toBeNull();
    expect(persistence.persist).not.toHaveBeenCalled();
    expect(prisma.integrationBinding.update).toHaveBeenCalled();
  });

  it('persiste coleta live válida e atualiza lastSyncAt', async () => {
    const { service, persistence } = setup(adapter({
      runtimeState: () => ({ mode: 'live', persistable: true, available: true }),
      collect: async () => [{
        collectedAt: new Date('2026-09-05T12:00:00.000Z'),
        communicationOk: true,
        powerKw: 1.2,
        energyTodayKwh: 3,
      }],
    }));
    const result = await service.collectInverter('i1');
    expect(result.ok).toBe(true);
    expect(result.persisted).toBe(1);
    expect(result.lastSyncAt).toBeTruthy();
    expect(persistence.persist).toHaveBeenCalled();
  });

  it('registra coleta sem dados', async () => {
    const { service } = setup(adapter({
      runtimeState: () => ({ mode: 'live', persistable: true, available: true }),
      collect: async () => [],
    }));
    const result = await service.collectInverter('i1');
    expect(result.ok).toBe(true);
    expect(result.readings).toBe(0);
    expect(result.message).toBe('Coleta realizada sem dados.');
  });

  it('atualiza lastError quando o adapter falha', async () => {
    const { service, prisma } = setup(adapter({
      runtimeState: () => ({ mode: 'live', persistable: true, available: true }),
      collect: async () => { throw new Error('timeout'); },
    }));
    await expect(service.collectInverter('i1')).rejects.toMatchObject({ code: 'COLLECTION_FAILED' });
    expect(prisma.integrationBinding.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ lastErrorAt: expect.any(Date) }),
    }));
  });

  it('impede coleta concorrente no mesmo processo', async () => {
    let release!: () => void;
    const hang = new Promise<never>((_resolve, _reject) => {
      release = () => _reject(new Error('stop'));
    });
    const { service } = setup(adapter({
      runtimeState: () => ({ mode: 'live', persistable: true, available: true }),
      collect: async () => hang as never,
    }));
    const first = service.collectInverter('i1');
    await Promise.resolve();
    await expect(service.collectInverter('i1')).rejects.toMatchObject({ code: 'CONCURRENT_COLLECTION' });
    release();
    await first.catch(() => undefined);
  });
});
