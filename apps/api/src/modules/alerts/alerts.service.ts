import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { AlertStatus, AlertSeverity } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ALERT_ACTOR_SYSTEM, ALERT_EVENT } from './alert.constants';
import { MonitoringAlertService } from './alert.engine';

const alertInclude = {
  plant: { include: { customer: true } },
  inverter: true,
  events: { orderBy: { createdAt: 'asc' as const } },
};

@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: MonitoringAlertService,
  ) {}

  listActive(customerId?: string | null) {
    return this.prisma.alert.findMany({
      where: {
        status: { in: ['OPEN', 'ACKNOWLEDGED'] },
        ...(customerId ? { plant: { customerId } } : {}),
      },
      include: { plant: { include: { customer: true } }, inverter: true },
      orderBy: { occurredAt: 'desc' },
    });
  }

  list(filters?: { status?: string; severity?: string; plantId?: string; inverterId?: string }) {
    return this.prisma.alert.findMany({
      where: {
        ...(filters?.status ? { status: filters.status as AlertStatus } : {}),
        ...(filters?.severity ? { severity: filters.severity as AlertSeverity } : {}),
        ...(filters?.plantId ? { plantId: filters.plantId } : {}),
        ...(filters?.inverterId ? { inverterId: filters.inverterId } : {}),
      },
      include: { plant: { include: { customer: true } }, inverter: true },
      orderBy: { occurredAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const alert = await this.prisma.alert.findUnique({ where: { id }, include: alertInclude });
    if (!alert) throw new NotFoundException('Alerta não encontrado.');
    return alert;
  }

  async acknowledge(id: string, actor: string) {
    const alert = await this.findOne(id);
    if (alert.status === 'RESOLVED') throw new UnprocessableEntityException('Não é possível reconhecer um alerta já resolvido.');
    if (alert.status === 'ACKNOWLEDGED') return alert;
    this.log({ event: 'acknowledged', alertId: id, actor });
    return this.prisma.alert.update({
      where: { id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        acknowledgedBy: actor,
        events: { create: { type: ALERT_EVENT.ACKNOWLEDGED, actor } },
      },
      include: alertInclude,
    });
  }

  async resolve(id: string, actor = ALERT_ACTOR_SYSTEM) {
    const alert = await this.findOne(id);
    if (alert.status === 'RESOLVED') throw new UnprocessableEntityException('Alerta já resolvido.');
    this.log({ event: 'resolved', alertId: id, actor });
    return this.prisma.alert.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy: actor,
        resolutionType: 'MANUAL',
        events: { create: { type: ALERT_EVENT.RESOLVED, actor } },
      },
      include: alertInclude,
    });
  }

  evaluateAbsence() {
    return this.engine.evaluateAbsenceForEligible();
  }

  private log(fields: Record<string, string>) {
    console.info(Object.fromEntries(
      Object.entries({ scope: 'ALERT', ...fields }).filter(([key]) => !/password|token|secret|authorization/i.test(key)),
    ));
  }
}
