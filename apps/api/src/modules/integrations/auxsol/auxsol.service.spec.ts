import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuxsolIntegrationService } from './auxsol.service';

describe('AuxsolIntegrationService', () => {
  it('bloqueia inversor que não é AUXSOL', async () => {
    const prisma = {
      inverter: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'i1',
          manufacturer: 'DEYE',
          manufacturerRef: { code: 'DEYE' },
          bindings: [],
        }),
      },
    };
    const service = new AuxsolIntegrationService(prisma as never, { collectInverter: jest.fn() } as never);
    await expect(service.syncInverter('i1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.syncInverter('i1')).rejects.toThrow('Este inversor não pertence ao fabricante AUXSOL.');
  });

  it('retorna 404 quando o inversor não existe', async () => {
    const prisma = { inverter: { findUnique: jest.fn().mockResolvedValue(null) } };
    const service = new AuxsolIntegrationService(prisma as never, { collectInverter: jest.fn() } as never);
    await expect(service.syncInverter('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
