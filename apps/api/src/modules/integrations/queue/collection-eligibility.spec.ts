import { CollectionEligibilityService, isEligibleInverter } from './collection-eligibility.service';

describe('Elegibilidade de coleta automática', () => {
  it('exclui inversor inativo', () => {
    expect(isEligibleInverter({
      status: 'INACTIVE',
      manufacturer: 'AUXSOL',
      manufacturerRef: { code: 'AUXSOL' },
      bindings: [{ provider: 'AUXSOL' }],
    })).toBe(false);
  });

  it('exclui inversor sem binding', () => {
    expect(isEligibleInverter({
      status: 'ACTIVE',
      manufacturer: 'AUXSOL',
      manufacturerRef: { code: 'AUXSOL' },
      bindings: [],
    })).toBe(false);
  });

  it('inclui inversor ativo com binding do fabricante', () => {
    expect(isEligibleInverter({
      status: 'ACTIVE',
      manufacturer: 'AUXSOL',
      manufacturerRef: { code: 'AUXSOL' },
      bindings: [{ provider: 'AUXSOL' }],
    })).toBe(true);
  });

  it('lista apenas ids elegíveis a partir do banco', async () => {
    const prisma = {
      inverter: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'ok', status: 'ACTIVE', manufacturer: 'AUXSOL', manufacturerRef: { code: 'AUXSOL' }, bindings: [{ provider: 'AUXSOL' }] },
          { id: 'off', status: 'INACTIVE', manufacturer: 'AUXSOL', manufacturerRef: { code: 'AUXSOL' }, bindings: [{ provider: 'AUXSOL' }] },
          { id: 'nobind', status: 'ACTIVE', manufacturer: 'DEYE', manufacturerRef: { code: 'DEYE' }, bindings: [] },
        ]),
      },
    };
    const service = new CollectionEligibilityService(prisma as never);
    await expect(service.listEligibleInverterIds()).resolves.toEqual(['ok']);
  });
});
