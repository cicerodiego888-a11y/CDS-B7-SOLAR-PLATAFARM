export interface NormalizedMonitoringData {
  externalPlantId?: string;
  externalInverterId?: string;
  collectedAt: Date;
  powerKw?: number;
  energyTodayKwh?: number;
  energyMonthKwh?: number;
  energyTotalKwh?: number;
  communicationOk: boolean;
  rawPayload?: unknown;
}

export interface MonitoringConnector {
  provider: string;
  testConnection(config: Record<string, unknown>): Promise<boolean>;
  collect(config: Record<string, unknown>): Promise<NormalizedMonitoringData[]>;
}
