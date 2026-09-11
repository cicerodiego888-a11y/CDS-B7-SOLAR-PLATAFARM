import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  AuthorizationService,
  MembershipsService,
  buildMembershipScopeKey,
} from './authorization.service';
import { getPermissionsForRole, hasPermission, normalizeProfile } from './permissions.catalog';

describe('Roles INVESTIDOR e CONSUMIDOR', () => {
  it('reconhece permissões mínimas de portal', () => {
    expect(hasPermission('INVESTIDOR', 'MONITORING_VIEW')).toBe(true);
    expect(hasPermission('CONSUMIDOR', 'DASHBOARD_VIEW')).toBe(true);
    expect(hasPermission('INVESTIDOR', 'USERS_DELETE')).toBe(false);
    expect(normalizeProfile('INVESTIDOR')).toBe('INVESTIDOR');
    expect(getPermissionsForRole('CONSUMIDOR')).toEqual(['DASHBOARD_VIEW', 'MONITORING_VIEW']);
  });

  it('ADMIN continua com permissões totais incluindo memberships', () => {
    expect(hasPermission('ADMINISTRADOR', 'USERS_MEMBERSHIPS_CREATE')).toBe(true);
    expect(hasPermission('OPERADOR', 'USERS_MEMBERSHIPS_CREATE')).toBe(false);
  });
});

describe('buildMembershipScopeKey', () => {
  it('gera chave estável para unicidade', () => {
    expect(buildMembershipScopeKey('c1', null)).toBe('c:c1|p:-');
    expect(buildMembershipScopeKey(null, 'p1')).toBe('c:-|p:p1');
    expect(buildMembershipScopeKey('c1', 'p1')).toBe('c:c1|p:p1');
  });
});

describe('AuthorizationService', () => {
  it('ADMIN é unrestricted', async () => {
    const auth = new AuthorizationService({} as never);
    const scope = await auth.resolveAccessScope({ sub: 'u1', email: 'a', role: 'ADMINISTRADOR' });
    expect(scope.unrestricted).toBe(true);
    expect(auth.canAccessPlant(scope, { id: 'any', customerId: 'any' })).toBe(true);
  });

  it('OPERADOR continua unrestricted (compatibilidade)', async () => {
    const auth = new AuthorizationService({} as never);
    const scope = await auth.resolveAccessScope({ sub: 'u1', email: 'a', role: 'OPERADOR' });
    expect(scope.unrestricted).toBe(true);
  });

  it('CUSTOMER legado usa customerId wide', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          customerId: 'c1',
          memberships: [],
        }),
      },
    };
    const auth = new AuthorizationService(prisma as never);
    const scope = await auth.resolveAccessScope({ sub: 'u1', email: 'c', role: 'CUSTOMER' });
    expect(scope.unrestricted).toBe(false);
    expect(scope.customerWideIds).toEqual(['c1']);
    expect(auth.canAccessPlant(scope, { id: 'p1', customerId: 'c1' })).toBe(true);
    expect(auth.canAccessPlant(scope, { id: 'p2', customerId: 'other' })).toBe(false);
  });

  it('INVESTIDOR com membership de plant acessa só a usina', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          customerId: null,
          memberships: [
            { customerId: 'c1', plantId: 'p1', plant: { customerId: 'c1' } },
          ],
        }),
      },
    };
    const auth = new AuthorizationService(prisma as never);
    const scope = await auth.resolveAccessScope({ sub: 'inv', email: 'i', role: 'INVESTIDOR' });
    expect(scope.plantIds).toEqual(['p1']);
    expect(scope.customerWideIds).toEqual([]);
    expect(auth.canAccessPlant(scope, { id: 'p1', customerId: 'c1' })).toBe(true);
    expect(auth.canAccessPlant(scope, { id: 'p2', customerId: 'c1' })).toBe(false);
  });

  it('membership INACTIVE não concede acesso', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          customerId: null,
          memberships: [], // query já filtra status ACTIVE
        }),
      },
    };
    const auth = new AuthorizationService(prisma as never);
    const scope = await auth.resolveAccessScope({ sub: 'inv', email: 'i', role: 'INVESTIDOR' });
    expect(scope.plantIds).toEqual([]);
    expect(scope.customerWideIds).toEqual([]);
    expect(auth.canAccessPlant(scope, { id: 'p1', customerId: 'c1' })).toBe(false);
  });

  it('CONSUMIDOR sem vínculo não acessa usina', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ customerId: null, memberships: [] }),
      },
    };
    const auth = new AuthorizationService(prisma as never);
    const scope = await auth.resolveAccessScope({ sub: 'c', email: 'c', role: 'CONSUMIDOR' });
    expect(auth.canAccessPlant(scope, { id: 'p1', customerId: 'c1' })).toBe(false);
  });

  it('buildPlantWhere retorna filtro impossível sem grants', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ customerId: null, memberships: [] }),
      },
    };
    const auth = new AuthorizationService(prisma as never);
    const where = await auth.buildPlantWhere({ sub: 'c', email: 'c', role: 'CONSUMIDOR' });
    expect(where).toEqual({ id: '__no_access__' });
  });
});

describe('MembershipsService', () => {
  it('cria vínculo com scopeKey', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1' }) },
      customer: { findUnique: jest.fn().mockResolvedValue({ id: 'c1' }) },
      plant: { findUnique: jest.fn() },
      userMembership: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'm1', ...data })),
      },
    };
    const service = new MembershipsService(prisma as never);
    const created = await service.create('u1', { role: 'INVESTIDOR', customerId: 'c1' });
    expect(created.scopeKey).toBe('c:c1|p:-');
    expect(prisma.userMembership.create).toHaveBeenCalled();
  });

  it('rejeita duplicata', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1' }) },
      customer: { findUnique: jest.fn().mockResolvedValue({ id: 'c1' }) },
      plant: { findUnique: jest.fn() },
      userMembership: {
        findUnique: jest.fn().mockResolvedValue({ id: 'existing' }),
        create: jest.fn(),
      },
    };
    const service = new MembershipsService(prisma as never);
    await expect(service.create('u1', { role: 'INVESTIDOR', customerId: 'c1' }))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('rejeita user inexistente', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const service = new MembershipsService(prisma as never);
    await expect(service.create('missing', { role: 'INVESTIDOR', customerId: 'c1' }))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejeita contexto sem customer e plant', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1' }) },
    };
    const service = new MembershipsService(prisma as never);
    await expect(service.create('u1', { role: 'INVESTIDOR' }))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('rejeita plant inexistente', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1' }) },
      plant: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const service = new MembershipsService(prisma as never);
    await expect(service.create('u1', { role: 'INVESTIDOR', plantId: 'missing' }))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('desativa vínculo (soft delete)', async () => {
    const prisma = {
      userMembership: {
        findFirst: jest.fn().mockResolvedValue({ id: 'm1', userId: 'u1', status: 'ACTIVE' }),
        update: jest.fn().mockResolvedValue({ id: 'm1', status: 'INACTIVE' }),
      },
    };
    const service = new MembershipsService(prisma as never);
    const result = await service.deactivate('u1', 'm1');
    expect(result.status).toBe('INACTIVE');
    expect(prisma.userMembership.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'INACTIVE' } }),
    );
  });

  it('reativa vínculo', async () => {
    const prisma = {
      userMembership: {
        findFirst: jest.fn().mockResolvedValue({ id: 'm1', userId: 'u1', status: 'INACTIVE' }),
        update: jest.fn().mockResolvedValue({ id: 'm1', status: 'ACTIVE' }),
      },
    };
    const service = new MembershipsService(prisma as never);
    const result = await service.updateStatus('u1', 'm1', 'ACTIVE');
    expect(result.status).toBe('ACTIVE');
  });
});
