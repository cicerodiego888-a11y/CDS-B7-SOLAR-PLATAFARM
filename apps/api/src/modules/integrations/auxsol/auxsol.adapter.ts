import {
  ConnectorCapability,
  ConnectorCollectContext,
  ConnectorRuntimeState,
  ConnectorTestResult,
  MonitoringConnector,
  NormalizedMonitoringData,
} from '../integration.contract';
import { AuxsolClient } from './auxsol.client';
import { AuxsolContractUnavailableError } from './auxsol.errors';
import { AuxsolFixtureReading, normalizeAuxsolFixture } from './auxsol.normalizer';
import { createAuxsolTransport } from './auxsol.transport';

export class AuxsolAdapter implements MonitoringConnector {
  readonly provider = 'AUXSOL';

  constructor(private readonly client = new AuxsolClient(createAuxsolTransport())) {}

  capabilities(): ConnectorCapability[] {
    return ['testConnection', 'collect'];
  }

  runtimeState(): ConnectorRuntimeState {
    const mode = this.client.mode;
    return {
      mode,
      persistable: mode === 'live' && process.env.AUXSOL_PERSIST_READINGS === 'true',
      available: true,
    };
  }

  async testConnection(config: Record<string, unknown> = {}): Promise<ConnectorTestResult> {
    try {
      await this.client.testConnection(config);
      return {
        ok: this.client.mode === 'mock' || this.client.mode === 'live',
        supported: this.client.mode !== 'blocked',
        mode: this.client.mode,
        message: this.client.mode === 'mock'
          ? 'Modo de fixture interno ativo. Não é comunicação oficial AUXSOL.'
          : 'Conexão realizada com sucesso.',
      };
    } catch (error) {
      if (error instanceof AuxsolContractUnavailableError) {
        return {
          ok: false,
          supported: false,
          mode: 'blocked',
          message: 'Não foi possível conectar. Contrato oficial AUXSOL ainda não configurado.',
        };
      }
      return {
        ok: false,
        supported: true,
        mode: this.client.mode,
        message: 'Não foi possível conectar.',
      };
    }
  }

  async collect(config: ConnectorCollectContext = {}): Promise<NormalizedMonitoringData[]> {
    const payload = await this.client.collect(config);
    return normalizeAuxsolFixture(payload as AuxsolFixtureReading, config.inverterId);
  }
}

export function createAuxsolAdapter() {
  return new AuxsolAdapter();
}
