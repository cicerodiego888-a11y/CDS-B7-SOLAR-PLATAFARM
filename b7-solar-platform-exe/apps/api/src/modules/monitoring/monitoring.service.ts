import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class MonitoringService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [plants, alerts, readings] = await Promise.all([
      this.prisma.plant.findMany({ include: { customer: true, inverters: true } }),
      this.prisma.alert.findMany({ where: { status: 'OPEN' }, orderBy: { occurredAt: 'desc' }, take: 20 }),
      this.prisma.monitoringReading.findMany({ orderBy: { collectedAt: 'desc' }, take: 500 }),
    ]);

    return {
      totals: {
        plants: plants.length,
        active: plants.filter(p => p.status === 'ACTIVE').length,
        warning: plants.filter(p => p.status === 'WARNING').length,
        offline: plants.filter(p => p.status === 'OFFLINE').length,
        openAlerts: alerts.length,
      },
      plants,
      alerts,
      latestReadings: readings,
    };
  }

  async plant(id: string) {
    return this.prisma.plant.findUnique({
      where: { id },
      include: {
        customer: true,
        inverters: true,
        alerts: { orderBy: { occurredAt: 'desc' }, take: 50 },
        readings: { orderBy: { collectedAt: 'desc' }, take: 500 },
      },
    });
  }
}
