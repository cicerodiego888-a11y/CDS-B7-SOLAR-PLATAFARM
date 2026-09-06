import { AlertSeverity } from '@prisma/client';

export const ALERT_RULE = {
  INVERTER_OFFLINE: 'INVERTER_OFFLINE',
  INVERTER_WARNING: 'INVERTER_WARNING',
  INVERTER_ERROR: 'INVERTER_ERROR',
  NO_RECENT_READING: 'NO_RECENT_READING',
  GENERATION_ANOMALY: 'GENERATION_ANOMALY',
} as const;

export type AlertRuleCode = (typeof ALERT_RULE)[keyof typeof ALERT_RULE];

export const ALERT_EVENT = {
  CREATED: 'ALERT_CREATED',
  ACKNOWLEDGED: 'ALERT_ACKNOWLEDGED',
  RESOLVED: 'ALERT_RESOLVED',
} as const;

export const ALERT_ACTOR_SYSTEM = 'SYSTEM';

export const RULE_SEVERITY: Record<AlertRuleCode, AlertSeverity> = {
  INVERTER_OFFLINE: 'CRITICAL',
  INVERTER_WARNING: 'WARNING',
  INVERTER_ERROR: 'CRITICAL',
  NO_RECENT_READING: 'CRITICAL',
  GENERATION_ANOMALY: 'WARNING',
};

export const RULE_TITLE: Record<AlertRuleCode, string> = {
  INVERTER_OFFLINE: 'Inversor offline',
  INVERTER_WARNING: 'Inversor em atenção',
  INVERTER_ERROR: 'Inversor em erro',
  NO_RECENT_READING: 'Ausência de leitura',
  GENERATION_ANOMALY: 'Anomalia de geração',
};

export function alertFingerprint(ruleCode: string, inverterId: string) {
  return `${ruleCode}:${inverterId}`;
}

export function noReadingThresholdSeconds() {
  const parsed = Number(process.env.MONITORING_NO_READING_THRESHOLD_SECONDS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 900;
}

export function generationAnomalyEnabled() {
  return process.env.MONITORING_GENERATION_ANOMALY_ENABLED === 'true';
}
