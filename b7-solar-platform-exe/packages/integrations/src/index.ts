export interface MonitoringConnector {
  provider: string;
  connect(config: Record<string, unknown>): Promise<void>;
  collect(): Promise<unknown[]>;
}