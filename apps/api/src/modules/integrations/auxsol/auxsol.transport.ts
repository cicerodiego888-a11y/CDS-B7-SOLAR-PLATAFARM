import { auxsolOfficialBaseUrl, auxsolTimeoutMs, resolveAuxsolMode } from './auxsol.config';
import { AuxsolAuthError, AuxsolContractUnavailableError, AuxsolTransientError } from './auxsol.errors';
import { AUXSOL_FIXTURE_VALID, AUXSOL_FIXTURE_EMPTY, AUXSOL_FIXTURE_OFFLINE } from './auxsol.fixtures';

export type AuxsolOperation = 'testConnection' | 'collect';

export interface AuxsolTransport {
  mode: 'live' | 'mock' | 'blocked';
  execute(operation: AuxsolOperation, params?: Record<string, unknown>): Promise<unknown>;
}

export class BlockedAuxsolTransport implements AuxsolTransport {
  readonly mode = 'blocked' as const;

  async execute(): Promise<never> {
    throw new AuxsolContractUnavailableError(
      'Comunicação real AUXSOL bloqueada: URL/contrato oficial não configurados.',
    );
  }
}

export class MockAuxsolTransport implements AuxsolTransport {
  readonly mode = 'mock' as const;

  constructor(private readonly scenario = 'valid') {}

  async execute(operation: AuxsolOperation): Promise<unknown> {
    if (this.scenario === 'auth') throw new AuxsolAuthError();
    if (this.scenario === 'timeout') throw new AuxsolTransientError('timeout');
    if (this.scenario === '429') throw new AuxsolTransientError('HTTP 429', 429);
    if (this.scenario === '500') throw new AuxsolTransientError('HTTP 500', 500);
    if (this.scenario === 'empty') return AUXSOL_FIXTURE_EMPTY;
    if (this.scenario === 'offline') return AUXSOL_FIXTURE_OFFLINE;
    if (operation === 'testConnection') return { ok: true, fixture: true };
    return AUXSOL_FIXTURE_VALID;
  }
}

export class HttpAuxsolTransport implements AuxsolTransport {
  readonly mode = 'live' as const;

  async execute(): Promise<never> {
    const base = auxsolOfficialBaseUrl();
    if (!base) {
      throw new AuxsolContractUnavailableError();
    }
    throw new AuxsolContractUnavailableError(
      'URL base informada, mas os caminhos oficiais da API AUXSOL ainda não foram documentados. Nenhuma rota foi inventada.',
    );
  }
}

export async function withTimeout<T>(factory: (signal: AbortSignal) => Promise<T>, timeoutMs = auxsolTimeoutMs()) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await factory(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) throw new AuxsolTransientError('timeout');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function createAuxsolTransport(scenario?: string): AuxsolTransport {
  const mode = resolveAuxsolMode();
  if (mode === 'mock') return new MockAuxsolTransport(scenario);
  if (mode === 'live') return new HttpAuxsolTransport();
  return new BlockedAuxsolTransport();
}
