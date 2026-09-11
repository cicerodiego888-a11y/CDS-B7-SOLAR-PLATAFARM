import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RecordStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AccessScope, JwtPayload } from './auth.types';
import { isAdministrator } from './permissions.catalog';

const STAFF_UNRESTRICTED_ROLES = new Set([
  'ADMIN',
  'ADMINISTRADOR',
  'OPERATOR',
  'OPERADOR',
  'TECHNICIAN',
  'TECNICO',
  'COMMERCIAL',
  'COMERCIAL',
  'POS_VENDA',
]);

export function buildMembershipScopeKey(customerId?: string | null, plantId?: string | null) {
  return `c:${customerId?.trim() || '-'}|p:${plantId?.trim() || '-'}`;
}

@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  isUnrestrictedRole(role: string) {
    return isAdministrator(role) || STAFF_UNRESTRICTED_ROLES.has(role);
  }

  async resolveAccessScope(user: JwtPayload): Promise<AccessScope> {
    if (this.isUnrestrictedRole(user.role)) {
      return {
        userId: user.sub,
        primaryRole: user.role,
        unrestricted: true,
        customerIds: [],
        customerWideIds: [],
        plantIds: [],
      };
    }

    const record = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: {
        customerId: true,
        memberships: {
          where: { status: 'ACTIVE' },
          select: { customerId: true, plantId: true, plant: { select: { customerId: true } } },
        },
      },
    });

    const customerWideIds = new Set<string>();
    const plantIds = new Set<string>();
    const customerIds = new Set<string>();

    // Legado User.customerId = grant em todo o customer
    if (record?.customerId) {
      customerWideIds.add(record.customerId);
      customerIds.add(record.customerId);
    }

    for (const membership of record?.memberships ?? []) {
      if (membership.plantId) {
        plantIds.add(membership.plantId);
        const plantCustomerId = membership.plant?.customerId ?? membership.customerId;
        if (plantCustomerId) customerIds.add(plantCustomerId);
      } else if (membership.customerId) {
        customerWideIds.add(membership.customerId);
        customerIds.add(membership.customerId);
      }
    }

    return {
      userId: user.sub,
      primaryRole: user.role,
      unrestricted: false,
      customerIds: [...customerIds],
      customerWideIds: [...customerWideIds],
      plantIds: [...plantIds],
    };
  }

  canAccessCustomer(scope: AccessScope, customerId: string) {
    if (scope.unrestricted) return true;
    return scope.customerIds.includes(customerId);
  }

  canAccessPlant(scope: AccessScope, plant: { id: string; customerId: string }) {
    if (scope.unrestricted) return true;
    if (scope.plantIds.includes(plant.id)) return true;
    if (scope.customerWideIds.includes(plant.customerId)) return true;
    return false;
  }

  async assertPlantAccess(user: JwtPayload, plant: { id: string; customerId: string }) {
    const scope = await this.resolveAccessScope(user);
    if (!this.canAccessPlant(scope, plant)) {
      throw new NotFoundException('Usina não encontrada.');
    }
    return scope;
  }

  /**
   * Filtro Prisma para listagens de Plant.
   * `undefined` = sem restrição (staff).
   */
  async buildPlantWhere(user: JwtPayload): Promise<Prisma.PlantWhereInput | undefined> {
    const scope = await this.resolveAccessScope(user);
    if (scope.unrestricted) return undefined;
    if (!scope.customerWideIds.length && !scope.plantIds.length) {
      return { id: '__no_access__' };
    }
    const clauses: Prisma.PlantWhereInput[] = [];
    if (scope.plantIds.length) clauses.push({ id: { in: scope.plantIds } });
    if (scope.customerWideIds.length) clauses.push({ customerId: { in: scope.customerWideIds } });
    return clauses.length === 1 ? clauses[0] : { OR: clauses };
  }
}

export type CreateMembershipInput = {
  role: UserRole;
  customerId?: string | null;
  plantId?: string | null;
  status?: RecordStatus;
};

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  listByUser(userId: string) {
    return this.ensureUser(userId).then(() =>
      this.prisma.userMembership.findMany({
        where: { userId },
        include: {
          customer: { select: { id: true, name: true } },
          plant: { select: { id: true, name: true, customerId: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  async create(userId: string, input: CreateMembershipInput) {
    await this.ensureUser(userId);
    const customerId = input.customerId?.trim() || null;
    const plantId = input.plantId?.trim() || null;

    if (!customerId && !plantId) {
      throw new ConflictException('Informe customerId e/ou plantId para o vínculo.');
    }

    if (plantId) {
      const plant = await this.prisma.plant.findUnique({ where: { id: plantId } });
      if (!plant) throw new NotFoundException('Usina não encontrada.');
      if (customerId && plant.customerId !== customerId) {
        throw new ConflictException('A usina não pertence ao cliente informado.');
      }
    } else if (customerId) {
      const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) throw new NotFoundException('Cliente não encontrado.');
    }

    const scopeKey = buildMembershipScopeKey(customerId, plantId);
    const existing = await this.prisma.userMembership.findUnique({
      where: { userId_role_scopeKey: { userId, role: input.role, scopeKey } },
    });
    if (existing) {
      throw new ConflictException('Já existe um vínculo com o mesmo papel e contexto.');
    }

    return this.prisma.userMembership.create({
      data: {
        userId,
        role: input.role,
        customerId,
        plantId,
        scopeKey,
        status: input.status ?? 'ACTIVE',
      },
      include: {
        customer: { select: { id: true, name: true } },
        plant: { select: { id: true, name: true, customerId: true } },
      },
    });
  }

  async updateStatus(userId: string, membershipId: string, status: RecordStatus) {
    const membership = await this.prisma.userMembership.findFirst({
      where: { id: membershipId, userId },
    });
    if (!membership) throw new NotFoundException('Vínculo não encontrado.');
    return this.prisma.userMembership.update({
      where: { id: membershipId },
      data: { status },
      include: {
        customer: { select: { id: true, name: true } },
        plant: { select: { id: true, name: true, customerId: true } },
      },
    });
  }

  /** Soft-delete: inativa o vínculo (preserva histórico). */
  async deactivate(userId: string, membershipId: string) {
    return this.updateStatus(userId, membershipId, 'INACTIVE');
  }

  private async ensureUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }
}
