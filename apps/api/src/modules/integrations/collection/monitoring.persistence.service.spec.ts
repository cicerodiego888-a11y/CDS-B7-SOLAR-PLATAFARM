import { MonitoringPersistenceService } from './monitoring.persistence.service';

function reading(overrides: Record<string, unknown> = {}) {
  return {
    collectedAt: new Date('2026-09-05T12:00:00.000Z'),
    communicationOk: true,
    powerKw: 1,
    energyTodayKwh: 2.5,
    ...overrides,
  };
}

describe('MonitoringPersistenceService', () => {
  it('persiste leitura válida e ignora inválida', async () => {
    const create = jest.fn();
    const findFirst = jest.fn().mockResolvedValue(null);
    const prisma = {
      $transaction: async (fn: (tx: unknown) => Promise<void>) => fn({ monitoringReading: { create, findFirst } }),
    };
    const service = new MonitoringPersistenceService(prisma as never);
    const result = await service.persist('p1', 'i1', 'AUXSOL', [
      reading(),
      reading({ collectedAt: undefined, powerKw: Number.NaN }),
    ]);
    expect(result.persisted).toBe(1);
    expect(result.skipped).toBe(1);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('grava status normalizado no rawPayload sem migration', async () => {
    const create = jest.fn();
    const findFirst = jest.fn().mockResolvedValue(null);
    const prisma = {
      $transaction: async (fn: (tx: unknown) => Promise<void>) => fn({ monitoringReading: { create, findFirst } }),
    };
    const service = new MonitoringPersistenceService(prisma as never);
    await service.persist('p1', 'i1', 'AUXSOL', [reading({ status: 'ONLINE' })]);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        rawPayload: expect.objectContaining({ normalizedStatus: 'ONLINE' }),
      }),
    }));
  });

  it('não duplica a mesma leitura', async () => {
    const create = jest.fn();
    const findFirst = jest.fn().mockResolvedValue({ id: 'existing' });
    const prisma = {
      $transaction: async (fn: (tx: unknown) => Promise<void>) => fn({ monitoringReading: { create, findFirst } }),
    };
    const service = new MonitoringPersistenceService(prisma as never);
    const result = await service.persist('p1', 'i1', 'AUXSOL', [reading()]);
    expect(result.persisted).toBe(0);
    expect(create).not.toHaveBeenCalled();
  });

  it('persiste duas leituras com timestamps diferentes', async () => {
    const create = jest.fn();
    const findFirst = jest.fn().mockResolvedValue(null);
    const prisma = {
      $transaction: async (fn: (tx: unknown) => Promise<void>) => fn({ monitoringReading: { create, findFirst } }),
    };
    const service = new MonitoringPersistenceService(prisma as never);
    const result = await service.persist('p1', 'i1', 'AUXSOL', [
      reading(),
      reading({ collectedAt: new Date('2026-09-05T12:05:00.000Z') }),
    ]);
    expect(result.persisted).toBe(2);
    expect(create).toHaveBeenCalledTimes(2);
  });
});
