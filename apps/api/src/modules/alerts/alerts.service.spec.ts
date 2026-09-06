import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { ALERT_ACTOR_SYSTEM } from './alert.constants';

function alert(overrides: Record<string, unknown> = {}) {
  return {
    id: 'a1',
    status: 'OPEN',
    plant: { customer: { name: 'Cliente' } },
    inverter: { model: 'INV' },
    events: [],
    ...overrides,
  };
}

describe('AlertsService', () => {
  function setup(current = alert()) {
    const prisma = {
      alert: {
        findMany: jest.fn().mockResolvedValue([current]),
        findUnique: jest.fn().mockResolvedValue(current.id === 'missing' ? null : current),
        update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ ...current, ...data })),
      },
    };
    const service = new AlertsService(prisma as never, { evaluateAbsenceForEligible: jest.fn() } as never);
    return { service, prisma };
  }

  it('reconhece alerta aberto e registra usuário sem resolver', async () => {
    const { service, prisma } = setup();
    const result = await service.acknowledge('a1', 'user-9');
    expect(prisma.alert.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'ACKNOWLEDGED',
        acknowledgedBy: 'user-9',
      }),
    }));
    expect(result.status).toBe('ACKNOWLEDGED');
    expect(result.status).not.toBe('RESOLVED');
  });

  it('não permite reconhecer alerta resolvido', async () => {
    const { service } = setup(alert({ status: 'RESOLVED' }));
    await expect(service.acknowledge('a1', 'user-9')).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('resolução manual registra usuário', async () => {
    const { service, prisma } = setup();
    await service.resolve('a1', 'user-9');
    expect(prisma.alert.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'RESOLVED',
        resolvedBy: 'user-9',
        resolutionType: 'MANUAL',
      }),
    }));
  });

  it('retorna 404 para alerta inexistente', async () => {
    const prisma = { alert: { findUnique: jest.fn().mockResolvedValue(null) } };
    const service = new AlertsService(prisma as never, {} as never);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.acknowledge('missing', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.resolve('missing', 'u1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('resolução automática usa SYSTEM no motor, não neste serviço manual', async () => {
    expect(ALERT_ACTOR_SYSTEM).toBe('SYSTEM');
  });
});
