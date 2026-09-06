import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PlantsService {
  constructor(private prisma: PrismaService) {}
  findAll() {
    return this.prisma.plant.findMany({
      include: { customer: true, inverters: true },
      orderBy: { createdAt: 'desc' },
    });
  }
  findOne(id: string) {
    return this.prisma.plant.findUnique({
      where: { id },
      include: { customer: true, inverters: true, alerts: true },
    });
  }
}