import { ConnectorCapability, ConnectorRuntimeState, ConnectorTestResult, MonitoringConnector, NormalizedMonitoringData } from './integration.contract';
import { InverterManufacturerCode, OFFICIAL_INVERTER_MANUFACTURERS } from './manufacturers.catalog';
import { createAuxsolAdapter } from './auxsol/auxsol.adapter';

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

  async collect(_config: Record<string, unknown>): Promise<NormalizedMonitoringData[]> {
    return [];
  }
}

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

export function createDefaultIntegrationEngine(): IntegrationEngine {
  const engine = new IntegrationEngine();
  for (const manufacturer of OFFICIAL_INVERTER_MANUFACTURERS) {
    if (manufacturer.code === 'AUXSOL') {
      engine.register(createAuxsolAdapter());
      continue;
    }
    engine.register(new PlannedManufacturerAdapter(manufacturer.code));
  }
  return engine;
}
