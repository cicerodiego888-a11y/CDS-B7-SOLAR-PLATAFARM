export type NormalizedStatus = 'ONLINE' | 'OFFLINE' | 'WARNING' | 'ERROR' | 'UNKNOWN';

export type ConnectorCapability = 'testConnection' | 'collect';

/** Contrato interno. O adapter normaliza o fabricante; o núcleo não conhece campos externos. */
export interface NormalizedMonitoringData {
  externalPlantId?: string;
  externalInverterId?: string;
  /** Instantâneo da leitura. Ausente/inválido rejeita a leitura. Não inventar Date.now(). */
  collectedAt?: Date;
  /** Potência instantânea em kW. Nunca usar como energia. */
  powerKw?: number;
  energyTodayKwh?: number;
  energyMonthKwh?: number;
  energyTotalKwh?: number;
  voltage?: number;
  current?: number;
  frequency?: number;
  temperature?: number;
  dcPowerKw?: number;
  acPowerKw?: number;
  status?: NormalizedStatus;
  communicationOk: boolean;
  rawPayload?: unknown;
  externalReadingId?: string;
}

export type NormalizedInverterReading = NormalizedMonitoringData;

export interface ConnectorTestResult {
  ok: boolean;
  supported: boolean;
  mode: 'live' | 'mock' | 'blocked';
  message: string;
}

export interface ConnectorCollectContext {
  inverterId?: string;
  externalId?: string;
  serialNumber?: string;
  [key: string]: unknown;
}

export interface ConnectorRuntimeState {
  mode: 'live' | 'mock' | 'blocked';
  persistable: boolean;
  available: boolean;
}

export type CollectionErrorCode =
  | 'INTEGRATION_NOT_CONFIGURED'
  | 'INTEGRATION_NOT_SUPPORTED'
  | 'INTEGRATION_BLOCKED'
  | 'COLLECTION_FAILED'
  | 'INVALID_READING'
  | 'PERSISTENCE_FAILED'
  | 'CONCURRENT_COLLECTION';

export interface CollectionResult {
  ok: boolean;
  inverterId: string;
  provider?: string;
  integrationId?: string;
  mode?: 'live' | 'mock' | 'blocked';
  readings: number;
  valid: number;
  persisted: number;
  skipped: number;
  lastSyncAt?: string | null;
  durationMs: number;
  code?: CollectionErrorCode;
  message: string;
}

export interface MonitoringConnector {
  provider: string;
  capabilities(): ConnectorCapability[];
  runtimeState(): ConnectorRuntimeState;
  testConnection(config: Record<string, unknown>): Promise<ConnectorTestResult>;
  collect(config: ConnectorCollectContext): Promise<NormalizedMonitoringData[]>;
}
