import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../auth/auth.types';
import { MonitoringAlertService } from '../alerts/alert.engine';
import { MonitoringAccessService } from './monitoring.access';
import { MonitoringAvailabilityService } from './monitoring.availability.service';
import { aggregatePlantAvailability, extractStoredStatus } from './monitoring.availability';
import { MonitoringHistoryService } from './monitoring.history.service';
import { toNumber } from './monitoring.aggregation';
import {
  DIAGNOSIS_CODE,
  DiagnosisCode,
  DiagnosisEvidence,
  DiagnosisTimelineEvent,
  OperationalDiagnosis,
} from './monitoring-diagnosis.types';

const ACTIVE_ALERT_STATUSES = ['OPEN', 'ACKNOWLEDGED'] as const;
const LOW_COVERAGE_PERCENT = 50;

type InverterWithPlant = Prisma.InverterGetPayload<{ include: { plant: { include: { customer: true } }; bindings: true; manufacturerRef: true } }>;

@Injectable()
export class MonitoringDiagnosisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: MonitoringAccessService,
    private readonly history: MonitoringHistoryService,
    private readonly availability: MonitoringAvailabilityService,
    private readonly alertEngine: MonitoringAlertService,
  ) {}

  async inverter(inverterId: string, user: JwtPayload) {
    const inverter = await this.access.assertInverter(inverterId, user) as InverterWithPlant;
    const [reading, alerts] = await Promise.all([
      this.latestReading(inverterId),
      this.prisma.alert.findMany({
        where: { inverterId },
        include: { events: { orderBy: { createdAt: 'asc' } } },
        orderBy: { occurredAt: 'desc' },
        take: 20,
      }),
    ]);
    const availability = await this.availability.forInverter(inverterId, { period: 'last7days' }, user);
    const binding = this.binding(inverter);
    const current = this.buildDiagnosis(inverter, reading, alerts, availability, binding);
    return {
      diagnosis: current,
      alerts: alerts.filter((alert) => ACTIVE_ALERT_STATUSES.includes(alert.status as typeof ACTIVE_ALERT_STATUSES[number])),
      latestReading: this.readingView(reading),
      availability,
      integration: this.integrationView(inverter, binding),
      evidence: current?.evidence ?? this.evidence(inverter, reading, availability, binding),
      impact: this.impact(inverter),
      timeline: this.timeline(reading, alerts),
    };
  }

  async plant(plantId: string, user: JwtPayload) {
    const plant = await this.access.assertPlant(plantId, user);
    const inverters = await this.prisma.inverter.findMany({
      where: { plantId },
      include: { plant: { include: { customer: true } }, bindings: true, manufacturerRef: true },
    });
    const [readings, alerts] = await Promise.all([
      this.latestReadings(plantId),
      this.prisma.alert.findMany({
        where: { plantId },
        include: { events: { orderBy: { createdAt: 'asc' } } },
        orderBy: { occurredAt: 'desc' },
      }),
    ]);
    const parsed = this.history.parseQuery({ period: 'last7days' });
    const availabilityByInverter = await this.availability.computeMany({
      inverters,
      period: parsed.period,
      from: parsed.from,
      to: parsed.to,
      alerts,
    });
    const readingByInverter = new Map(readings.map((reading) => [reading.inverterId, reading]));
    const alertsByInverter = new Map<string, typeof alerts>();
    for (const alert of alerts) {
      if (!alert.inverterId) continue;
      alertsByInverter.set(alert.inverterId, [...(alertsByInverter.get(alert.inverterId) ?? []), alert]);
    }
    const diagnoses = inverters.map((inverter) => this.buildDiagnosis(
      inverter,
      readingByInverter.get(inverter.id) ?? null,
      alertsByInverter.get(inverter.id) ?? [],
      availabilityByInverter.get(inverter.id) ?? null,
      this.binding(inverter),
    )).filter((item): item is OperationalDiagnosis => Boolean(item));
    const affected = diagnoses.length;
    const ratedPowerKw = diagnoses.reduce((sum, item) => sum + (item.impact.ratedPowerKw ?? 0), 0);
    const critical = diagnoses.filter((item) => item.severity === 'CRITICAL').length;
    const attention = diagnoses.filter((item) => item.status === 'ATTENTION' || item.severity === 'WARNING').length;
    const lastCommunication = readings.map((item) => item.collectedAt).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    const plantAvailability = aggregatePlantAvailability({
      plantId,
      period: parsed.period,
      timezone: availabilityByInverter.values().next().value?.timezone ?? 'UTC',
      from: parsed.from,
      to: parsed.to,
      inverters: [...availabilityByInverter.values()],
    });
    return {
      plant: { id: plant.id, name: plant.name, customer: plant.customer },
      health: { status: critical ? 'CRITICAL' : attention ? 'ATTENTION' : diagnoses.some((item) => item.status === 'NO_DATA') ? 'NO_DATA' : 'HEALTHY' },
      availability: plantAvailability.availabilityPercent,
      coverage: plantAvailability.coveragePercent,
      totalInverters: inverters.length,
      affectedInverters: affected,
      incidents: diagnoses,
      critical,
      attention,
      ratedPowerKw: ratedPowerKw || null,
      lastCommunication,
      summary: diagnoses.length && (critical || attention) ? `${critical} crítica(s) e ${attention} em atenção.` : 'Nenhum incidente operacional ativo.',
    };
  }

  async overview(user: JwtPayload, query: {
    severity?: string;
    code?: string;
    customerId?: string;
    plantId?: string;
    manufacturerId?: string;
    search?: string;
    page?: string;
    pageSize?: string;
  } = {}) {
    const plantWhere = await this.access.buildPlantWhere(user);
    const selectedCustomerId = !plantWhere ? (query.customerId?.trim() || undefined) : undefined;
    const search = query.search?.trim();
    const plants = await this.prisma.plant.findMany({
      where: {
        ...(plantWhere ?? {}),
        ...(selectedCustomerId ? { customerId: selectedCustomerId } : {}),
        ...(query.plantId ? { id: query.plantId } : {}),
        ...(query.manufacturerId ? { inverters: { some: { OR: [
          { manufacturerId: query.manufacturerId },
          { manufacturerRef: { code: query.manufacturerId } },
        ] } } } : {}),
        ...(search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { customer: { name: { contains: search, mode: 'insensitive' } } },
            { inverters: { some: { OR: [
              { manufacturer: { contains: search, mode: 'insensitive' } },
              { model: { contains: search, mode: 'insensitive' } },
              { serialNumber: { contains: search, mode: 'insensitive' } },
            ] } } },
          ],
        } : {}),
      },
      include: { customer: true, inverters: { include: { plant: { include: { customer: true } }, bindings: true, manufacturerRef: true } } },
      orderBy: { name: 'asc' },
    });
    const inverterIds = plants.flatMap((plant) => plant.inverters.map((inverter) => inverter.id));
    const [readings, alerts] = await Promise.all([
      inverterIds.length ? this.prisma.monitoringReading.findMany({ where: { inverterId: { in: inverterIds } }, orderBy: { collectedAt: 'desc' }, select: { inverterId: true, collectedAt: true, powerKw: true, communicationOk: true, rawPayload: true } }) : Promise.resolve([]),
      plants.length ? this.prisma.alert.findMany({ where: { plantId: { in: plants.map((plant) => plant.id) } }, include: { events: { orderBy: { createdAt: 'asc' } } }, orderBy: { occurredAt: 'desc' } }) : Promise.resolve([]),
    ]);
    const latestByInverter = new Map<string, (typeof readings)[number]>();
    for (const reading of readings) if (reading.inverterId && !latestByInverter.has(reading.inverterId)) latestByInverter.set(reading.inverterId, reading);
    const parsed = this.history.parseQuery({ period: 'last7days' });
    const availabilityByInverter = await this.availability.computeMany({
      inverters: plants.flatMap((plant) => plant.inverters),
      period: parsed.period,
      from: parsed.from,
      to: parsed.to,
      alerts,
    });
    const alertsByInverter = new Map<string, typeof alerts>();
    for (const alert of alerts) if (alert.inverterId) alertsByInverter.set(alert.inverterId, [...(alertsByInverter.get(alert.inverterId) ?? []), alert]);
    const incidents = plants.flatMap((plant) => plant.inverters.map((inverter) => this.buildDiagnosis(
      inverter,
      latestByInverter.get(inverter.id) ?? null,
      alertsByInverter.get(inverter.id) ?? [],
      availabilityByInverter.get(inverter.id) ?? null,
      this.binding(inverter),
    )).filter((item): item is OperationalDiagnosis => Boolean(item)));
    const inverterById = new Map(plants.flatMap((plant) => plant.inverters).map((inverter) => [inverter.id, inverter]));
    const filtered = this.sortDiagnoses(incidents).filter((item) => {
      if (query.severity && item.severity !== query.severity.toUpperCase()) return false;
      if (query.code && item.code !== query.code.toUpperCase()) return false;
      if (query.manufacturerId) {
        const inverter = inverterById.get(item.inverter.id);
        if (inverter?.manufacturerId !== query.manufacturerId && inverter?.manufacturerRef?.code !== query.manufacturerId) return false;
      }
      return true;
    });
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || filtered.length || 1));
    const paged = query.page || query.pageSize ? filtered.slice((page - 1) * pageSize, page * pageSize) : filtered;
    const result = {
      incidents: paged,
      total: filtered.length,
      critical: filtered.filter((item) => item.severity === 'CRITICAL').length,
      attention: filtered.filter((item) => item.status === 'ATTENTION' || item.severity === 'WARNING').length,
      affectedInverters: filtered.length,
      ratedPowerKw: filtered.reduce((sum, item) => sum + (item.impact.ratedPowerKw ?? 0), 0) || null,
    };
    return query.page || query.pageSize ? { ...result, page, pageSize, items: paged } : result;
  }

  private buildDiagnosis(
    inverter: InverterWithPlant,
    reading: Awaited<ReturnType<MonitoringDiagnosisService['latestReading']>>,
    alerts: Array<{ id: string; ruleCode: string; severity: string; status: string; occurredAt: Date; createdAt: Date }>,
    availability: Awaited<ReturnType<MonitoringAvailabilityService['forInverter']>>,
    binding: InverterWithPlant['bindings'][number] | undefined,
  ): OperationalDiagnosis | null {
    const active = alerts.filter((alert) => ACTIVE_ALERT_STATUSES.includes(alert.status as typeof ACTIVE_ALERT_STATUSES[number]));
    const alert = active.sort((a, b) => this.severityRank(a.severity) - this.severityRank(b.severity) || b.occurredAt.getTime() - a.occurredAt.getTime())[0];
    const collectability = this.alertEngine.resolveCollectability(inverter);
    let code: DiagnosisCode | null = this.isDiagnosisCode(alert?.ruleCode) ? alert?.ruleCode as DiagnosisCode : null;
    if (!code && collectability === 'NOT_CONFIGURED') code = DIAGNOSIS_CODE.INTEGRATION_NOT_CONFIGURED;
    if (!code && (collectability === 'BLOCKED' || collectability === 'NOT_SUPPORTED')) code = DIAGNOSIS_CODE.INTEGRATION_BLOCKED;
    if (!code && availability?.reason === 'NO_DATA' && !reading) code = DIAGNOSIS_CODE.NO_DATA;
    if (!code && availability && availability.coveragePercent < LOW_COVERAGE_PERCENT && availability.observedSeconds > 0) code = DIAGNOSIS_CODE.LOW_COVERAGE;
    if (!code) return null;
    const definition = this.definition(code);
    const since = alert?.createdAt ?? undefined;
    const durationSeconds = since ? Math.max(0, Math.floor((Date.now() - since.getTime()) / 1000)) : undefined;
    const evidence = this.evidence(inverter, reading, availability, binding, alert);
    return {
      code,
      title: definition.title,
      severity: definition.severity,
      status: definition.status,
      ...(since ? { since: since.toISOString(), durationSeconds } : {}),
      customer: { id: inverter.plant.customer.id, name: inverter.plant.customer.name },
      plant: { id: inverter.plant.id, name: inverter.plant.name },
      inverter: { id: inverter.id, name: inverter.model },
      evidence,
      impact: this.impact(inverter),
      recommendedAction: definition.action,
      ...(alert ? { alertReference: { id: alert.id, status: alert.status } } : {}),
    };
  }

  private definition(code: DiagnosisCode) {
    const definitions: Record<DiagnosisCode, { title: string; severity: 'CRITICAL' | 'WARNING' | 'INFO'; status: 'ACTIVE' | 'ATTENTION' | 'NO_DATA'; action: string }> = {
      INVERTER_OFFLINE: { title: 'Inversor sem comunicação', severity: 'CRITICAL', status: 'ACTIVE', action: 'Verificar comunicação do inversor, datalogger/gateway e conexão de rede.' },
      INVERTER_ERROR: { title: 'Falha reportada pelo inversor', severity: 'CRITICAL', status: 'ACTIVE', action: 'Verificar o código ou mensagem informado pelo equipamento e consultar o diagnóstico do fabricante.' },
      INVERTER_WARNING: { title: 'Inversor operando em estado de atenção', severity: 'WARNING', status: 'ATTENTION', action: 'Verificar o estado atual do equipamento e os avisos apresentados pelo fabricante.' },
      NO_RECENT_READING: { title: 'Sem leitura recente', severity: 'CRITICAL', status: 'ACTIVE', action: 'Verificar a comunicação entre equipamento, datalogger/gateway e plataforma.' },
      INTEGRATION_NOT_CONFIGURED: { title: 'Integração não configurada', severity: 'INFO', status: 'ATTENTION', action: 'Configurar a integração do fabricante para iniciar a coleta.' },
      INTEGRATION_BLOCKED: { title: 'Integração bloqueada', severity: 'INFO', status: 'ATTENTION', action: 'Validar a configuração e autorização da integração.' },
      LOW_COVERAGE: { title: 'Baixa cobertura de monitoramento', severity: 'WARNING', status: 'ATTENTION', action: 'Verificar a frequência das leituras e a comunicação da integração.' },
      NO_DATA: { title: 'Sem dados suficientes para diagnóstico', severity: 'INFO', status: 'NO_DATA', action: 'Aguardar dados de monitoramento ou verificar a configuração da coleta.' },
    };
    return definitions[code];
  }

  private isDiagnosisCode(value?: string | null): value is DiagnosisCode {
    return Boolean(value && Object.values(DIAGNOSIS_CODE).includes(value as DiagnosisCode));
  }

  private evidence(inverter: InverterWithPlant, reading: Awaited<ReturnType<MonitoringDiagnosisService['latestReading']>>, availability: Awaited<ReturnType<MonitoringAvailabilityService['forInverter']>>, binding?: InverterWithPlant['bindings'][number], alert?: { id: string; createdAt: Date }) : DiagnosisEvidence {
    const payload = reading?.rawPayload;
    const values = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
    return {
      ...(alert ? { alertId: alert.id, alertCreatedAt: alert.createdAt.toISOString() } : {}),
      ...(reading ? { lastReadingAt: reading.collectedAt.toISOString(), normalizedStatus: extractStoredStatus(payload) ?? (reading.communicationOk === false ? 'OFFLINE' : 'ONLINE') } : {}),
      availability: availability?.availabilityPercent ?? null,
      coverage: availability?.coveragePercent ?? null,
      lastSyncAt: binding?.lastSyncAt?.toISOString() ?? null,
      integrationStatus: binding?.status ?? null,
      manufacturerId: inverter.manufacturerId,
      manufacturer: inverter.manufacturerRef?.name ?? inverter.manufacturer,
      model: inverter.model,
      serialNumber: inverter.serialNumber,
      ratedPowerKw: toNumber(inverter.ratedPowerKw),
      equipmentCode: this.stringValue(values, ['errorCode', 'faultCode', 'code']),
      equipmentMessage: this.stringValue(values, ['errorMessage', 'faultMessage', 'message']),
    };
  }

  private impact(inverter: InverterWithPlant) {
    return { affectedInverters: 1, ratedPowerKw: toNumber(inverter.ratedPowerKw) };
  }

  private timeline(reading: Awaited<ReturnType<MonitoringDiagnosisService['latestReading']>>, alerts: Array<{ id: string; occurredAt: Date; status: string; events: Array<{ id: string; type: string; createdAt: Date }> }>): DiagnosisTimelineEvent[] {
    const events: DiagnosisTimelineEvent[] = reading ? [{ type: 'READ', at: reading.collectedAt.toISOString(), label: 'Leitura recebida', status: extractStoredStatus(reading.rawPayload) ?? (reading.communicationOk === false ? 'OFFLINE' : 'ONLINE') }] : [];
    for (const alert of alerts) {
      events.push({ type: 'ALERT_OPENED', at: alert.occurredAt.toISOString(), label: 'Alerta aberto', alertId: alert.id });
      for (const event of alert.events) {
        if (event.type === 'ALERT_ACKNOWLEDGED') events.push({ type: 'ALERT_ACKNOWLEDGED', at: event.createdAt.toISOString(), label: 'Alerta reconhecido', alertId: alert.id });
        if (event.type === 'ALERT_RESOLVED') events.push({ type: 'ALERT_RESOLVED', at: event.createdAt.toISOString(), label: 'Alerta resolvido', alertId: alert.id });
      }
    }
    return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }

  private binding(inverter: InverterWithPlant) {
    return inverter.bindings.find((item) => item.provider === inverter.manufacturer) ?? inverter.bindings[0];
  }

  private integrationView(inverter: InverterWithPlant, binding: InverterWithPlant['bindings'][number] | undefined) {
    return { provider: binding?.provider ?? inverter.manufacturer, binding: binding ?? null, collectability: this.alertEngine.resolveCollectability(inverter) };
  }

  private readingView(reading: Awaited<ReturnType<MonitoringDiagnosisService['latestReading']>>) {
    if (!reading) return null;
    return { collectedAt: reading.collectedAt, powerKw: toNumber(reading.powerKw), communicationOk: reading.communicationOk, normalizedStatus: extractStoredStatus(reading.rawPayload) ?? null };
  }

  private async latestReading(inverterId: string) {
    return this.prisma.monitoringReading.findFirst({ where: { inverterId }, orderBy: { collectedAt: 'desc' }, select: { collectedAt: true, powerKw: true, communicationOk: true, rawPayload: true } });
  }

  private async latestReadings(plantId: string) {
    const rows = await this.prisma.monitoringReading.findMany({ where: { plantId, inverterId: { not: null } }, orderBy: { collectedAt: 'desc' }, select: { inverterId: true, collectedAt: true, powerKw: true, communicationOk: true, rawPayload: true } });
    const latest = new Map<string, (typeof rows)[number]>();
    for (const row of rows) if (row.inverterId && !latest.has(row.inverterId)) latest.set(row.inverterId, row);
    return [...latest.values()];
  }

  private sortDiagnoses(items: OperationalDiagnosis[]) {
    return [...items].sort((a, b) => this.severityRank(a.severity) - this.severityRank(b.severity)
      || (b.impact.ratedPowerKw ?? 0) - (a.impact.ratedPowerKw ?? 0)
      || new Date(a.since ?? 0).getTime() - new Date(b.since ?? 0).getTime());
  }

  private severityRank(value: string) { return value === 'CRITICAL' ? 0 : value === 'WARNING' ? 1 : 2; }
  private stringValue(values: Record<string, unknown>, keys: string[]) { const value = keys.map((key) => values[key]).find((item) => typeof item === 'string'); return typeof value === 'string' ? value : null; }
}