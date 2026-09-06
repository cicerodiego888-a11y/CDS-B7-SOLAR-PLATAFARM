import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../auth/auth.types';
import { MonitoringAlertService } from '../alerts/alert.engine';
import { MonitoringAccessService } from './monitoring.access';
import {
  AvailabilityReading,
  InverterAvailability,
  aggregatePlantAvailability,
  calculateInverterAvailability,
  extractStoredStatus,
} from './monitoring.availability';
import { HistoryQuery, MonitoringHistoryService } from './monitoring.history.service';
import { monitoringTimeZone } from './monitoring.timezone';

type InverterRow = {
  id: string;
  plantId: string;
  status?: string | null;
  manufacturer: string;
  manufacturerRef?: { code: string } | null;
  bindings: Array<{ provider: string; status?: string }>;
};

const EQUIPMENT_CRITICAL = new Set(['INVERTER_OFFLINE', 'INVERTER_ERROR']);

@Injectable()
export class MonitoringAvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly history: MonitoringHistoryService,
    private readonly access: MonitoringAccessService,
    private readonly alerts: MonitoringAlertService,
  ) {}

  async query(query: HistoryQuery, user: JwtPayload) {
    const parsed = this.history.parseQuery(query);
    if (parsed.inverterId) {
      await this.access.assertInverter(parsed.inverterId, user);
    }
    if (parsed.plantId) {
      await this.access.assertPlant(parsed.plantId, user);
    }
    const customerId = await this.access.customerScope(user);
    const inverters = await this.prisma.inverter.findMany({
      where: {
        ...(parsed.inverterId ? { id: parsed.inverterId } : {}),
        ...(parsed.plantId ? { plantId: parsed.plantId } : {}),
        ...(customerId ? { plant: { customerId } } : {}),
      },
      include: { manufacturerRef: true, bindings: true },
    });
    const results = await this.computeMany({
      inverters,
      period: parsed.period,
      from: parsed.from,
      to: parsed.to,
    });
    const list = [...results.values()];
    if (parsed.inverterId) {
      return { timezone: monitoringTimeZone(), period: parsed.period, inverter: list[0] ?? null };
    }
    if (parsed.plantId) {
      return {
        timezone: monitoringTimeZone(),
        period: parsed.period,
        plant: aggregatePlantAvailability({
          plantId: parsed.plantId,
          period: parsed.period,
          timezone: monitoringTimeZone(),
          from: parsed.from,
          to: parsed.to,
          inverters: list,
        }),
        inverters: list,
      };
    }
    return { timezone: monitoringTimeZone(), period: parsed.period, inverters: list };
  }

  async forInverter(inverterId: string, query: HistoryQuery, user: JwtPayload) {
    const result = await this.query({ ...query, inverterId }, user);
    return result.inverter ?? null;
  }

  async forPlant(plantId: string, query: HistoryQuery, user: JwtPayload) {
    return this.query({ ...query, plantId }, user);
  }

  async computeMany(input: {
    inverters: InverterRow[];
    period: string;
    from: Date;
    to: Date;
    timezone?: string;
    alerts?: Array<{ inverterId?: string | null; ruleCode?: string | null; severity?: string | null }>;
    now?: Date;
  }) {
    const timezone = input.timezone ?? monitoringTimeZone();
    const ids = input.inverters.map((item) => item.id);
    const [readings, alerts] = await Promise.all([
      ids.length ? this.loadReadings(ids, input.from, input.to) : Promise.resolve([]),
      input.alerts
        ? Promise.resolve(input.alerts)
        : ids.length ? this.loadActiveAlerts(ids) : Promise.resolve([]),
    ]);
    const readingsByInverter = new Map<string, AvailabilityReading[]>();
    for (const reading of readings) {
      if (!reading.inverterId) continue;
      const list = readingsByInverter.get(reading.inverterId) ?? [];
      list.push(reading);
      readingsByInverter.set(reading.inverterId, list);
    }
    const results = new Map<string, InverterAvailability>();
    for (const inverter of input.inverters) {
      const inverterAlerts = alerts.filter((item) => item.inverterId === inverter.id);
      results.set(inverter.id, calculateInverterAvailability({
        inverterId: inverter.id,
        plantId: inverter.plantId,
        period: input.period,
        timezone,
        from: input.from,
        to: input.to,
        readings: readingsByInverter.get(inverter.id) ?? [],
        now: input.now,
        collectability: this.alerts.resolveCollectability(inverter),
        inverterStatus: inverter.status,
        hasCriticalEquipmentAlert: inverterAlerts.some((item) => EQUIPMENT_CRITICAL.has(item.ruleCode ?? '')),
        hasWarningAlert: inverterAlerts.some((item) => item.ruleCode === 'INVERTER_WARNING' || item.severity === 'WARNING'),
      }));
    }
    return results;
  }

  private async loadReadings(inverterIds: string[], from: Date, to: Date) {
    const rows = await this.prisma.monitoringReading.findMany({
      where: {
        inverterId: { in: inverterIds },
        collectedAt: { gte: from, lt: to },
      },
      select: {
        inverterId: true,
        collectedAt: true,
        communicationOk: true,
        powerKw: true,
        rawPayload: true,
      },
      orderBy: { collectedAt: 'asc' },
    });
    return rows.map((row) => ({
      inverterId: row.inverterId,
      collectedAt: row.collectedAt,
      communicationOk: row.communicationOk,
      powerKw: row.powerKw == null ? null : Number(row.powerKw),
      status: extractStoredStatus(row.rawPayload),
    }));
  }

  private loadActiveAlerts(inverterIds: string[]) {
    return this.prisma.alert.findMany({
      where: {
        inverterId: { in: inverterIds },
        status: { in: ['OPEN', 'ACKNOWLEDGED'] },
      },
      select: { inverterId: true, ruleCode: true, severity: true },
    });
  }
}
