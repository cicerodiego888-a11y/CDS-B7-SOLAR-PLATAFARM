import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../auth/auth.types';

@Injectable()
export class MonitoringAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async customerScope(user: JwtPayload) {
    if (user.role !== 'CUSTOMER') return null;
    const record = await this.prisma.user.findUnique({ where: { id: user.sub }, select: { customerId: true } });
    if (!record?.customerId) throw new ForbiddenException('Acesso negado');
    return record.customerId;
  }

  async assertPlant(id: string, user: JwtPayload) {
    const plant = await this.prisma.plant.findUnique({
      where: { id },
      include: { customer: true, inverters: true },
    });
    if (!plant) throw new NotFoundException('Usina não encontrada.');
    const scope = await this.customerScope(user);
    if (scope && plant.customerId !== scope) throw new ForbiddenException('Acesso negado');
    return plant;
  }

  async assertInverter(id: string, user: JwtPayload) {
    const inverter = await this.prisma.inverter.findUnique({
      where: { id },
      include: {
        plant: { include: { customer: true } },
        bindings: true,
      },
    });
    if (!inverter) throw new NotFoundException('Inversor não encontrado.');
    const scope = await this.customerScope(user);
    if (scope && inverter.plant.customerId !== scope) throw new ForbiddenException('Acesso negado');
    return inverter;
  }
}
