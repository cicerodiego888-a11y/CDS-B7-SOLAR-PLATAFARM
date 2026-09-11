export const DIAGNOSIS_CODE = {
  INVERTER_OFFLINE: 'INVERTER_OFFLINE',
  INVERTER_ERROR: 'INVERTER_ERROR',
  INVERTER_WARNING: 'INVERTER_WARNING',
  NO_RECENT_READING: 'NO_RECENT_READING',
  INTEGRATION_NOT_CONFIGURED: 'INTEGRATION_NOT_CONFIGURED',
  INTEGRATION_BLOCKED: 'INTEGRATION_BLOCKED',
  LOW_COVERAGE: 'LOW_COVERAGE',
  NO_DATA: 'NO_DATA',
} as const;

export type DiagnosisCode = (typeof DIAGNOSIS_CODE)[keyof typeof DIAGNOSIS_CODE];
export type DiagnosisSeverity = 'CRITICAL' | 'WARNING' | 'INFO';
export type DiagnosisStatus = 'ACTIVE' | 'ATTENTION' | 'NO_DATA';

export type DiagnosisEvidence = {
  alertId?: string;
  alertCreatedAt?: string;
  lastReadingAt?: string;
  normalizedStatus?: string | null;
  availability?: number | null;
  coverage?: number | null;
  lastSyncAt?: string | null;
  integrationStatus?: string | null;
  manufacturerId?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  ratedPowerKw?: number | null;
  equipmentMessage?: string | null;
  equipmentCode?: string | null;
};

export type DiagnosisTimelineEvent = {
  type: 'READ' | 'ALERT_OPENED' | 'ALERT_ACKNOWLEDGED' | 'ALERT_RESOLVED';
  at: string;
  label: string;
  status?: string | null;
  alertId?: string;
};

export type OperationalDiagnosis = {
  code: DiagnosisCode;
  title: string;
  severity: DiagnosisSeverity;
  status: DiagnosisStatus;
  since?: string;
  durationSeconds?: number;
  customer: { id: string; name: string };
  plant: { id: string; name: string };
  inverter: { id: string; name: string | null };
  evidence: DiagnosisEvidence;
  impact: { affectedInverters: number; ratedPowerKw: number | null };
  recommendedAction: string;
  alertReference?: { id: string; status: string };
};