import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../auth/auth.types';
import { MonitoringAlertService } from '../alerts/alert.engine';
import { AlertsService } from '../alerts/alerts.service';
import { HealthService } from '../health/health.service';
import { toNumber } from '../monitoring/monitoring.aggregation';
import { MonitoringAccessService } from '../monitoring/monitoring.access';
import { MonitoringAvailabilityService } from '../monitoring/monitoring.availability.service';
import { aggregatePlantAvailability } from '../monitoring/monitoring.availability';
import { MonitoringHistoryService } from '../monitoring/monitoring.history.service';
import { monitoringTimeZone } from '../monitoring/monitoring.timezone';
import {
  resolveInverterIssue,
  resolveOperationsPlantStatus,
  sortAlertsByPriority,
} from './operations.status';

const PERIODS = ['today', 'yesterday', 'last7days', 'last30days', 'thisMonth'] as const;

@Injectable()
export class OperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: MonitoringAccessService,
    private readonly history: MonitoringHistoryService,
    private readonly alerts: AlertsService,
    private readonly alertEngine: MonitoringAlertService,
    private readonly health: HealthService,
    private readonly availability: MonitoringAvailabilityService,
  ) {}

  async overview(
    user: JwtPayload,
    query: { period?: string; status?: string; customerId?: string; search?: string } = {},
  ) {
    const period = PERIODS.includes(query.period as typeof PERIODS[number]) ? query.period as typeof PERIODS[number] : 'today';
    const customerId = await this.access.customerScope(user);
    const search = query.search?.trim();

    const parsed = this.history.parseQuery({ period });
    const [plants, activeAlerts, latest, history, health] = await Promise.all([
      this.prisma.plant.findMany({
        where: {
          ...(customerId ? { customerId } : {}),
          ...(query.customerId && !customerId ? { customerId: query.customerId } : {}),
          ...(search ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { customer: { name: { contains: search, mode: 'insensitive' } } },
              { inverters: { some: { OR: [
                { model: { contains: search, mode: 'insensitive' } },
                { serialNumber: { contains: search, mode: 'insensitive' } },
              ] } } },
            ],
          } : {}),
        },
        include: {
          customer: true,
          inverters: { include: { manufacturerRef: true, bindings: true } },
        },
        orderBy: { name: 'asc' },
      }),
      this.alerts.listActive(customerId),
      this.history.latestReadings({ customerId }),
      this.history.compute(this.history.parseQuery({ period }), customerId),
      this.health.status(),
    ]);

    const availabilityByInverter = await this.availability.computeMany({
      inverters: plants.flatMap((plant) => plant.inverters),
      period,
      from: parsed.from,
      to: parsed.to,
      timezone: monitoringTimeZone(),
      alerts: activeAlerts,
    });

    const latestByInverter = new Map(latest.filter((item) => item.inverterId).map((item) => [item.inverterId as string, item]));
    const alertsByInverter = new Map<string, typeof activeAlerts>();
    const alertsByPlant = new Map<string, typeof activeAlerts>();
    for (const alert of activeAlerts) {
      const plantList = alertsByPlant.get(alert.plantId) ?? [];
      plantList.push(alert);
      alertsByPlant.set(alert.plantId, plantList);
      if (alert.inverterId) {
        const list = alertsByInverter.get(alert.inverterId) ?? [];
        list.push(alert);
        alertsByInverter.set(alert.inverterId, list);
      }
    }

    const allPlantRows = plants.map((plant) => {
      const inverterInputs = plant.inverters.map((inverter) => {
        const reading = latestByInverter.get(inverter.id);
        const alerts = alertsByInverter.get(inverter.id) ?? [];
        return {
          inverter,
          reading,
          collectability: this.alertEngine.resolveCollectability(inverter),
          communicationOk: reading ? reading.communicationOk : null,
          hasReading: Boolean(reading),
          hasOfflineAlert: alerts.some((item) => item.ruleCode === 'INVERTER_OFFLINE' || item.ruleCode === 'NO_RECENT_READING'),
          hasErrorAlert: alerts.some((item) => item.ruleCode === 'INVERTER_ERROR'),
          hasWarningAlert: alerts.some((item) => item.ruleCode === 'INVERTER_WARNING' || item.severity === 'WARNING'),
        };
      });
      const operationalStatus = resolveOperationsPlantStatus(
        plant.status,
        inverterInputs.map(({ inverter: _inverter, reading: _reading, ...input }) => input),
      );
      const lastReadingAt = inverterInputs
        .map((item) => item.reading?.collectedAt)
        .filter((value): value is Date => Boolean(value))
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
      const energyKwh = history.byPlant[plant.id] ?? null;
      const plantAvailability = aggregatePlantAvailability({
        plantId: plant.id,
        period,
        timezone: monitoringTimeZone(),
        from: parsed.from,
        to: parsed.to,
        inverters: plant.inverters
          .map((inverter) => availabilityByInverter.get(inverter.id))
          .filter((item): item is NonNullable<typeof item> => Boolean(item)),
      });
      return {
        id: plant.id,
        name: plant.name,
        customerId: plant.customerId,
        customerName: plant.customer?.name ?? null,
        cadastralStatus: plant.status,
        operationalStatus,
        installedPowerKwp: toNumber(plant.installedPowerKw),
        energyKwh,
        hasGeneration: energyKwh !== null,
        inverterCount: plant.inverters.length,
        activeAlerts: (alertsByPlant.get(plant.id) ?? []).length,
        lastReadingAt,
        availabilityPercent: plantAvailability.availabilityPercent,
        coveragePercent: plantAvailability.coveragePercent,
        health: plantAvailability.health,
        availabilityReason: plantAvailability.reason,
      };
    });
    const plantRows = allPlantRows.filter((row) => !query.status || row.operationalStatus === query.status);

    const inverterIssues = plants.flatMap((plant) => plant.inverters.map((inverter) => {
      const reading = latestByInverter.get(inverter.id);
      const alerts = alertsByInverter.get(inverter.id) ?? [];
      const input = {
        collectability: this.alertEngine.resolveCollectability(inverter),
        communicationOk: reading ? reading.communicationOk : null,
        hasReading: Boolean(reading),
        hasOfflineAlert: alerts.some((item) => item.ruleCode === 'INVERTER_OFFLINE' || item.ruleCode === 'NO_RECENT_READING'),
        hasErrorAlert: alerts.some((item) => item.ruleCode === 'INVERTER_ERROR'),
        hasWarningAlert: alerts.some((item) => item.ruleCode === 'INVERTER_WARNING' || item.severity === 'WARNING'),
      };
      const issue = resolveInverterIssue(input);
      if (!issue) return null;
      const latestAlert = sortAlertsByPriority(alerts)[0];
      const availability = availabilityByInverter.get(inverter.id);
      return {
        id: inverter.id,
        model: inverter.model,
        plantId: plant.id,
        plantName: plant.name,
        status: issue,
        lastReadingAt: reading?.collectedAt ?? null,
        lastAlert: latestAlert ? { id: latestAlert.id, title: latestAlert.title, severity: latestAlert.severity } : null,
        availabilityPercent: availability?.availabilityPercent ?? null,
        coveragePercent: availability?.coveragePercent ?? 0,
        health: availability?.health ?? 'NO_DATA',
      };
    })).filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => issueRank(a.status) - issueRank(b.status));

    const allInverters = plants.flatMap((plant) => plant.inverters);
    const inverterOnline = allInverters.filter((inverter) => latestByInverter.get(inverter.id)?.communicationOk === true).length;
    const inverterOffline = allInverters.filter((inverter) => {
      const reading = latestByInverter.get(inverter.id);
      const collectability = this.alertEngine.resolveCollectability(inverter);
      return collectability === 'COLLECTABLE' && reading?.communicationOk === false;
    }).length;
    const inverterWarning = inverterIssues.filter((item) => item.status === 'WARNING' || item.status === 'ERROR').length;

    const priorityAlerts = sortAlertsByPriority(activeAlerts).slice(0, 12).map((alert) => ({
      id: alert.id,
      title: alert.title,
      severity: alert.severity,
      status: alert.status,
      occurredAt: alert.occurredAt,
      ruleCode: alert.ruleCode,
      plantId: alert.plantId,
      plantName: alert.plant?.name ?? null,
      inverterId: alert.inverterId,
      inverterName: alert.inverter?.model ?? null,
    }));

    const recent = [
      ...latest.map((item) => ({
        type: 'READING' as const,
        at: item.collectedAt,
        label: 'Leitura recebida',
        plantId: item.plantId,
        inverterId: item.inverterId,
      })),
      ...activeAlerts.map((alert) => ({
        type: 'ALERT' as const,
        at: alert.occurredAt,
        label: alert.title,
        plantId: alert.plantId,
        inverterId: alert.inverterId,
      })),
    ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 8);

    return {
      period,
      generatedAt: new Date().toISOString(),
      health: { api: health.api, database: health.database, redis: health.redis, status: health.status },
      summary: {
        plants: plants.length,
        plantsOnline: allPlantRows.filter((item) => item.operationalStatus === 'ONLINE').length,
        plantsWarning: allPlantRows.filter((item) => item.operationalStatus === 'WARNING').length,
        plantsOffline: allPlantRows.filter((item) => item.operationalStatus === 'OFFLINE').length,
        inverters: allInverters.length,
        invertersOnline: inverterOnline,
        invertersWarning: inverterWarning,
        invertersOffline: inverterOffline,
        openAlerts: activeAlerts.length,
      },
      plants: plantRows,
      inverterIssues,
      alerts: priorityAlerts,
      recent,
      empty: {
        plants: plants.length === 0,
        alerts: activeAlerts.length === 0,
        issues: inverterIssues.length === 0,
        readings: latest.length === 0,
      },
    };
  }
}

function issueRank(status: string) {
  if (status === 'ERROR') return 0;
  if (status === 'OFFLINE') return 1;
  return 2;
}
