import { auxsolMaxRetries, integrationLog } from './auxsol.config';
import { AuxsolAuthError, AuxsolTransientError, isTransientAuxsolError } from './auxsol.errors';
import { AuxsolOperation, AuxsolTransport } from './auxsol.transport';

export class AuxsolClient {
  constructor(private readonly transport: AuxsolTransport) {}

  get mode() {
    return this.transport.mode;
  }

  async testConnection(config: Record<string, unknown> = {}) {
    return this.request('testConnection', config);
  }

  async collect(config: Record<string, unknown> = {}) {
    return this.request('collect', config);
  }

  private async request(operation: AuxsolOperation, params: Record<string, unknown>) {
    let attempt = 0;
    const max = auxsolMaxRetries();
    while (true) {
      const started = Date.now();
      try {
        const result = await this.transport.execute(operation, params);
        console.info(integrationLog({
          operation,
          status: 'success',
          mode: this.transport.mode,
          durationMs: Date.now() - started,
          inverterId: typeof params.inverterId === 'string' ? params.inverterId : undefined,
        }));
        return result;
      } catch (error) {
        const transient = isTransientAuxsolError(error);
        console.error(integrationLog({
          operation,
          status: 'error',
          mode: this.transport.mode,
          durationMs: Date.now() - started,
          errorCode: error instanceof Error ? error.name : 'unknown',
          attempt,
        }));
        if (error instanceof AuxsolAuthError) throw error;
        if (transient && attempt < max) {
          attempt += 1;
          continue;
        }
        if (error instanceof AuxsolTransientError) throw error;
        throw error;
      }
    }
  }
}
