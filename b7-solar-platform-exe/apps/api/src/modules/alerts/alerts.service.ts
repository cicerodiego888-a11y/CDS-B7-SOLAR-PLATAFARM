import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.alert.findMany({
      include: { plant: { include: { customer: true } } },
      orderBy: { occurredAt: 'desc' },
    });
  }

  async resolve(id: string) {
    const exists = await this.prisma.alert.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Alerta não encontrado');
    return this.prisma.alert.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });
  }
}
