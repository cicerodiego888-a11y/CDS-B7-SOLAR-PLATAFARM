import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { hasPermission } from '../auth/permissions.catalog';
import { EquipmentService } from './equipment.service';

describe('EquipmentService', () => {
  let service: EquipmentService;
  let prisma: {
    equipment: { findMany: jest.Mock; findUnique: jest.Mock; findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
    plant: { findUnique: jest.Mock };
    inverter: { findUnique: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      equipment: { findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      plant: { findUnique: jest.fn() },
      inverter: { findUnique: jest.fn() },
    };
    service = new EquipmentService(prisma as never);
  });

  it('cria equipamento válido', async () => {
    prisma.plant.findUnique.mockResolvedValue({ id: 'p1' });
    prisma.equipment.findFirst.mockResolvedValue(null);
    prisma.equipment.create.mockResolvedValue({ id: 'e1', type: 'GATEWAY' });
    await expect(service.create({ plantId: 'p1', type: 'GATEWAY', serialNumber: 'EQ1' })).resolves.toMatchObject({ id: 'e1' });
  });

  it('rejeita usina inexistente', async () => {
    prisma.plant.findUnique.mockResolvedValue(null);
    await expect(service.create({ plantId: 'missing', type: 'MEDIDOR', serialNumber: 'EQ1' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('busca e atualiza equipamento', async () => {
    prisma.equipment.findUnique.mockResolvedValue({ id: 'e1', plantId: 'p1', type: 'MEDIDOR', serialNumber: 'EQ1' });
    prisma.equipment.update.mockResolvedValue({ id: 'e1', model: 'M2' });
    await expect(service.findOne('e1')).resolves.toMatchObject({ id: 'e1' });
    await expect(service.update('e1', { model: 'M2' })).resolves.toMatchObject({ model: 'M2' });
  });

  it('bloqueia usuário sem permissão', () => {
    expect(hasPermission('OPERADOR', 'EQUIPMENT_CREATE')).toBe(false);
    expect(() => {
      if (!hasPermission('OPERADOR', 'EQUIPMENT_CREATE')) throw new ForbiddenException('Acesso negado');
    }).toThrow(ForbiddenException);
  });
});
