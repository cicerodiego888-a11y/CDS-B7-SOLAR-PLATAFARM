import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MonitoringAvailabilityService } from './monitoring.availability.service';
import { MonitoringHistoryService } from './monitoring.history.service';

describe('MonitoringAvailabilityService', () => {
  const user = { sub: 'u1', role: 'ADMIN', email: 'a' };

  function setup(inverters: unknown[], readings: unknown[] = []) {
    const findManyInverter = jest.fn().mockResolvedValue(inverters);
    const findManyReading = jest.fn().mockResolvedValue(readings);
    const findManyAlert = jest.fn().mockResolvedValue([]);
    const prisma = {
      inverter: { findMany: findManyInverter },
      monitoringReading: { findMany: findManyReading },
      alert: { findMany: findManyAlert },
    };
    const history = new MonitoringHistoryService({} as never, {} as never);
    const access = {
      assertInverter: jest.fn().mockImplementation(async (id: string) => {
        if (id === 'missing') throw new NotFoundException('Inversor não encontrado.');
        return { id };
      }),
      assertPlant: jest.fn().mockImplementation(async (id: string) => {
        if (id === 'missing') throw new NotFoundException('Usina não encontrada.');
        return { id };
      }),
      buildPlantWhere: jest.fn().mockResolvedValue(undefined),
    };
    const alerts = {
      resolveCollectability: jest.fn((inverter: { bindings?: Array<{ status?: string }> }) => {
        if (!inverter.bindings?.length) return 'NOT_CONFIGURED';
        if (inverter.bindings[0].status === 'NOT_CONFIGURED') return 'BLOCKED';
        return inverter.bindings[0].status === 'CONNECTED' ? 'COLLECTABLE' : 'BLOCKED';
      }),
    };
    const service = new MonitoringAvailabilityService(
      prisma as never,
      history,
      access as never,
      alerts as never,
    );
    return { service, prisma, access, findManyReading };
  }

  it('consulta leituras em lote, sem N+1', async () => {
    const { service, findManyReading } = setup([
      { id: 'i1', plantId: 'p1', manufacturer: 'AUXSOL', bindings: [{ provider: 'AUXSOL', status: 'CONNECTED' }] },
      { id: 'i2', plantId: 'p1', manufacturer: 'AUXSOL', bindings: [{ provider: 'AUXSOL', status: 'CONNECTED' }] },
    ]);
    await service.computeMany({
      inverters: [
        { id: 'i1', plantId: 'p1', manufacturer: 'AUXSOL', bindings: [{ provider: 'AUXSOL', status: 'CONNECTED' }] },
        { id: 'i2', plantId: 'p1', manufacturer: 'AUXSOL', bindings: [{ provider: 'AUXSOL', status: 'CONNECTED' }] },
      ],
      period: 'today',
      from: new Date('2026-09-05T03:00:00.000Z'),
      to: new Date('2026-09-06T03:00:00.000Z'),
      alerts: [],
    });
    expect(findManyReading).toHaveBeenCalledTimes(1);
  });

  it('BLOCKED permanece N/D', async () => {
    const { service } = setup([]);
    const map = await service.computeMany({
      inverters: [{ id: 'i1', plantId: 'p1', manufacturer: 'AUXSOL', bindings: [{ provider: 'AUXSOL', status: 'NOT_CONFIGURED' }] }],
      period: 'today',
      from: new Date('2026-09-05T12:00:00.000Z'),
      to: new Date('2026-09-05T13:00:00.000Z'),
      now: new Date('2026-09-05T13:00:00.000Z'),
      alerts: [],
    });
    expect(map.get('i1')).toMatchObject({
      availabilityPercent: null,
      coveragePercent: 0,
      reason: 'INTEGRATION_BLOCKED',
      health: 'NO_DATA',
    });
  });

  it('NOT_CONFIGURED permanece N/D', async () => {
    const { service } = setup([]);
    const map = await service.computeMany({
      inverters: [{ id: 'i1', plantId: 'p1', manufacturer: 'AUXSOL', bindings: [] }],
      period: 'today',
      from: new Date('2026-09-05T12:00:00.000Z'),
      to: new Date('2026-09-05T13:00:00.000Z'),
      now: new Date('2026-09-05T13:00:00.000Z'),
      alerts: [],
    });
    expect(map.get('i1')?.reason).toBe('INTEGRATION_NOT_CONFIGURED');
  });

  it('404 para inversor inexistente', async () => {
    const { service } = setup([]);
    await expect(service.forInverter('missing', { period: 'today' }, user)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('CUSTOMER isolado recebe 403', async () => {
    const { service, access } = setup([]);
    access.assertPlant.mockRejectedValue(new ForbiddenException('Acesso negado'));
    await expect(service.forPlant('p-other', { period: 'today' }, { ...user, role: 'CUSTOMER' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });
});
