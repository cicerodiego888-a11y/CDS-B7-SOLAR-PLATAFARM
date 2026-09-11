import { auxsolTokenRefreshMarginMs } from './auxsol.config';
import { AuxsolFetch, requestAuxsolAccessToken } from './auxsol.http';

type CachedToken = {
  accessToken: string;
  /** Epoch ms a partir do qual o token não deve mais ser reutilizado. */
  refreshAt: number;
};

export type AuxsolTokenManagerOptions = {
  baseUrl: string;
  appId: string;
  appSecret: string;
  timeoutMs?: number;
  fetchImpl?: AuxsolFetch;
  refreshMarginMs?: number;
  now?: () => number;
};

/**
 * Cache em memória do ACCESS_TOKEN com single-flight para concorrência.
 * Não persiste em disco/Redis — escopo do processo API.
 */
export class AuxsolTokenManager {
  private cache: CachedToken | null = null;
  private inflight: Promise<string> | null = null;
  private readonly now: () => number;
  private readonly refreshMarginMs: number;

  constructor(private readonly options: AuxsolTokenManagerOptions) {
    this.now = options.now ?? (() => Date.now());
    this.refreshMarginMs = options.refreshMarginMs ?? auxsolTokenRefreshMarginMs();
  }

  /** Invalida o cache (ex.: após 401 em chamada autenticada futura). */
  invalidate() {
    this.cache = null;
  }

  async getAccessToken(): Promise<string> {
    if (this.cache && this.now() < this.cache.refreshAt) {
      return this.cache.accessToken;
    }
    if (this.inflight) {
      return this.inflight;
    }
    this.inflight = this.refresh().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async refresh(): Promise<string> {
    // Re-check cache: outro waiter pode ter preenchido antes de entrarmos no refresh.
    if (this.cache && this.now() < this.cache.refreshAt) {
      return this.cache.accessToken;
    }
    const token = await requestAuxsolAccessToken({
      baseUrl: this.options.baseUrl,
      appId: this.options.appId,
      appSecret: this.options.appSecret,
      timeoutMs: this.options.timeoutMs,
      fetchImpl: this.options.fetchImpl,
    });
    const margin = Math.min(this.refreshMarginMs, Math.max(0, token.expiresIn * 1000 - 1));
    this.cache = {
      accessToken: token.accessToken,
      refreshAt: this.now() + token.expiresIn * 1000 - margin,
    };
    return token.accessToken;
  }
}
