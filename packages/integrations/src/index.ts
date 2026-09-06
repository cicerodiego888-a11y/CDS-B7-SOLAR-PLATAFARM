import {
  OFFICIAL_INVERTER_MANUFACTURERS,
  type InverterManufacturerCode,
  type InverterReading,
} from '../../types/src';

export type NormalizedStatus = InverterReading['status'];
export type ConnectorCapability = 'testConnection' | 'collect';

export interface NormalizedMonitoringData {
  externalPlantId?: string;
  externalInverterId?: string;
  collectedAt?: Date;
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

export interface MonitoringConnector {
  provider: InverterManufacturerCode | string;
  capabilities(): ConnectorCapability[];
  runtimeState(): ConnectorRuntimeState;
  testConnection(config: Record<string, unknown>): Promise<ConnectorTestResult>;
  collect(config: ConnectorCollectContext): Promise<NormalizedMonitoringData[]>;
}

/**
 * Motor de Integrações: o monitoramento consome apenas o conector resolvido.
 * Detalhes de cada fabricante ficam no adaptador correspondente.
 */
export class IntegrationEngine {
  private readonly adapters = new Map<string, MonitoringConnector>();

  register(adapter: MonitoringConnector) {
    this.adapters.set(adapter.provider, adapter);
    return this;
  }

  resolve(provider: string): MonitoringConnector | undefined {
    return this.adapters.get(provider);
  }

  listProviders(): string[] {
    return [...this.adapters.keys()];
  }
}

/** Adaptador reservado: sem coleta real nesta sprint. */
export class PlannedManufacturerAdapter implements MonitoringConnector {
  constructor(public readonly provider: InverterManufacturerCode) {}

  capabilities(): ConnectorCapability[] {
    return ['testConnection', 'collect'];
  }

  runtimeState(): ConnectorRuntimeState {
    return { mode: 'blocked', persistable: false, available: false };
  }

  async testConnection(_config: Record<string, unknown>): Promise<ConnectorTestResult> {
    return {
      ok: false,
      supported: false,
      mode: 'blocked',
      message: 'Adaptador ainda não implementado para este fabricante.',
    };
  }

  async collect(_config: ConnectorCollectContext): Promise<NormalizedMonitoringData[]> {
    return [];
  }
}

export function createDefaultIntegrationEngine(): IntegrationEngine {
  const engine = new IntegrationEngine();
  for (const manufacturer of OFFICIAL_INVERTER_MANUFACTURERS) {
    engine.register(new PlannedManufacturerAdapter(manufacturer.code));
  }
  return engine;
}

export { OFFICIAL_INVERTER_MANUFACTURERS };
