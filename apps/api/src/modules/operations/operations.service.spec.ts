import { OperationsService } from './operations.service';

const user = { sub: 'u1', role: 'ADMIN', email: 'a' };

function plant(id: string, name: string, inverters: unknown[] = []) {
  return {
    id,
    name,
    status: 'ACTIVE',
    customerId: 'c1',
    customer: { name: 'Cliente A' },
    installedPowerKw: 120,
    inverters,
  };
}

function inverter(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    model: `INV-${id}`,
    manufacturer: 'AUXSOL',
    manufacturerRef: { code: 'AUXSOL' },
    bindings: [{ provider: 'AUXSOL', status: 'NOT_CONFIGURED' }],
    ...overrides,
  };
}

describe('OperationsService', () => {
  function setup(plants: unknown[], alerts: unknown[] = [], latest: unknown[] = [], byPlant: Record<string, number> = {}) {
    const prisma = { plant: { findMany: jest.fn().mockResolvedValue(plants) } };
    const access = { customerScope: jest.fn().mockResolvedValue(null) };
    const history = {
      latestReadings: jest.fn().mockResolvedValue(latest),
      parseQuery: jest.fn((query) => ({
        period: query.period || 'today',
        from: new Date('2026-09-05T03:00:00.000Z'),
        to: new Date('2026-09-06T03:00:00.000Z'),
      })),
      compute: jest.fn().mockResolvedValue({ byPlant, energyKwh: Object.values(byPlant)[0] ?? null, hasData: Object.keys(byPlant).length > 0 }),
    };
    const alertsService = { listActive: jest.fn().mockResolvedValue(alerts) };
    const alertEngine = {
      resolveCollectability: jest.fn((item: { bindings?: Array<{ status?: string }> }) => (
        item.bindings?.[0]?.status === 'CONNECTED' ? 'COLLECTABLE' : 'BLOCKED'
      )),
    };
    const health = { status: jest.fn().mockResolvedValue({ api: 'ok', database: 'ok', redis: 'ok', status: 'ok' }) };
    const availability = {
      computeMany: jest.fn().mockResolvedValue(new Map()),
    };
    const service = new OperationsService(
      prisma as never,
      access as never,
      history as never,
      alertsService as never,
      alertEngine as never,
      health as never,
      availability as never,
    );
    return { service, prisma, history, alertsService, availability };
  }

  it('Central sem usinas', async () => {
    const { service, prisma } = setup([]);
    const result = await service.overview(user);
    expect(result.summary.plants).toBe(0);
    expect(result.empty.plants).toBe(true);
    expect(result.plants).toEqual([]);
    expect(prisma.plant.findMany).toHaveBeenCalledTimes(1);
  });

  it('Central com usina e múltiplas usinas', async () => {
    const { service } = setup([plant('p1', 'Fazenda A'), plant('p2', 'Fazenda B')]);
    const result = await service.overview(user);
    expect(result.summary.plants).toBe(2);
    expect(result.plants.map((item) => item.name)).toEqual(['Fazenda A', 'Fazenda B']);
  });

  it('conta inversores e não marca BLOCKED como offline', async () => {
    const { service } = setup([
      plant('p1', 'Fazenda A', [inverter('i1'), inverter('i2')]),
    ]);
    const result = await service.overview(user);
    expect(result.summary.inverters).toBe(2);
    expect(result.summary.invertersOffline).toBe(0);
    expect(result.inverterIssues).toEqual([]);
    expect(result.plants[0].operationalStatus).toBe('ONLINE');
    expect(result.plants[0].hasGeneration).toBe(false);
    expect(result.plants[0].energyKwh).toBeNull();
    expect(result.plants[0].lastReadingAt).toBeNull();
  });

  it('conta alertas ativos e ignora RESOLVED', async () => {
    const { service, alertsService } = setup([plant('p1', 'A')], [
      { id: 'a1', plantId: 'p1', inverterId: 'i1', severity: 'CRITICAL', status: 'OPEN', occurredAt: new Date(), title: 'Off', ruleCode: 'INVERTER_OFFLINE', plant: { name: 'A' }, inverter: { model: 'X' } },
    ]);
    const result = await service.overview(user);
    expect(alertsService.listActive).toHaveBeenCalled();
    expect(result.summary.openAlerts).toBe(1);
    expect(result.alerts[0].status).toBe('OPEN');
  });

  it('filtra por status operacional', async () => {
    const { service } = setup([plant('p1', 'A')]);
    const result = await service.overview(user, { status: 'OFFLINE' });
    expect(result.plants).toEqual([]);
    expect(result.summary.plants).toBe(1);
  });

  it('usa aggregateEnergyHistory via history.compute', async () => {
    const { service, history } = setup([plant('p1', 'A')], [], [], { p1: 1240 });
    const result = await service.overview(user, { period: 'last7days' });
    expect(history.parseQuery).toHaveBeenCalledWith({ period: 'last7days' });
    expect(history.compute).toHaveBeenCalled();
    expect(result.plants[0].energyKwh).toBe(1240);
    expect(result.plants[0].hasGeneration).toBe(true);
  });

  it('mostra última leitura real', async () => {
    const when = new Date('2026-09-05T16:32:00.000Z');
    const { service } = setup(
      [plant('p1', 'A', [inverter('i1')])],
      [],
      [{ plantId: 'p1', inverterId: 'i1', collectedAt: when, communicationOk: true }],
    );
    const result = await service.overview(user);
    expect(result.plants[0].lastReadingAt).toEqual(when);
  });

  it('lista somente inversores problemáticos coletáveis', async () => {
    const { service } = setup([
      plant('p1', 'A', [
        inverter('off', { bindings: [{ provider: 'AUXSOL', status: 'CONNECTED' }] }),
        inverter('ok', { bindings: [{ provider: 'AUXSOL', status: 'CONNECTED' }] }),
        inverter('blocked'),
      ]),
    ], [], [
      { plantId: 'p1', inverterId: 'off', collectedAt: new Date(), communicationOk: false },
      { plantId: 'p1', inverterId: 'ok', collectedAt: new Date(), communicationOk: true },
    ]);
    const result = await service.overview(user);
    expect(result.inverterIssues.map((item) => item.id)).toEqual(['off']);
  });

  it('evita N+1: uma consulta de usinas, alertas, leituras e histórico', async () => {
    const { service, prisma, history, alertsService, availability } = setup([plant('p1', 'A'), plant('p2', 'B')]);
    await service.overview(user);
    expect(prisma.plant.findMany).toHaveBeenCalledTimes(1);
    expect(alertsService.listActive).toHaveBeenCalledTimes(1);
    expect(history.latestReadings).toHaveBeenCalledTimes(1);
    expect(history.compute).toHaveBeenCalledTimes(1);
    expect(availability.computeMany).toHaveBeenCalledTimes(1);
  });
});
