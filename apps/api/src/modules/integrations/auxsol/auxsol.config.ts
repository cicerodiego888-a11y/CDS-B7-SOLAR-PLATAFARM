import { EnvSecretProvider } from '../secret.provider';
import { omitSensitiveKeys } from '../security.redact';

export type AuxsolRuntimeMode = 'live' | 'mock' | 'blocked';

/** Código de sucesso documentado no contrato AUXSOL (POST /auth/token). */
export const AUXSOL_SUCCESS_CODE = 'AWX-0000';

/** Path oficial de autenticação — Fase 1. */
export const AUXSOL_AUTH_TOKEN_PATH = '/auth/token';

/** Path oficial de realtime por SN — Fase 2. `{sn}` é substituído em runtime. */
export const AUXSOL_INVERTER_REALTIME_BY_SN_PATH =
  '/analysis/inverterReport/findInverterRealTimeInfoBySn/{sn}';

export function auxsolInverterRealtimeBySnPath(sn: string) {
  return `/analysis/inverterReport/findInverterRealTimeInfoBySn/${encodeURIComponent(sn)}`;
}

/**
 * Margem de renovação do token antes de expires_in.
 * Decisão Fase 1: 60s (evita usar token na janela final de expiração).
 * Override: AUXSOL_TOKEN_REFRESH_MARGIN_MS
 */
export const AUXSOL_DEFAULT_TOKEN_REFRESH_MARGIN_MS = 60_000;

/** Teto para aguardar Retry-After em 429 (não bloquear worker por minutos). */
export const AUXSOL_MAX_RETRY_AFTER_WAIT_MS = 5_000;

export function auxsolTimeoutMs() {
  const parsed = Number(process.env.AUXSOL_API_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10000;
}

export function auxsolMaxRetries() {
  const parsed = Number(process.env.AUXSOL_HTTP_MAX_RETRIES);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.min(parsed, 3) : 2;
}

export function auxsolTokenRefreshMarginMs() {
  const parsed = Number(process.env.AUXSOL_TOKEN_REFRESH_MARGIN_MS);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : AUXSOL_DEFAULT_TOKEN_REFRESH_MARGIN_MS;
}

export function auxsolMockAllowed() {
  const requested = process.env.AUXSOL_MOCK_MODE === 'true';
  if (!requested) return false;
  if (process.env.NODE_ENV === 'production' && process.env.AUXSOL_ALLOW_MOCK_IN_PRODUCTION !== 'true') {
    return false;
  }
  return true;
}

export function auxsolOfficialBaseUrl() {
  const value = process.env.AUXSOL_API_BASE_URL?.trim();
  return value || undefined;
}

export function auxsolAppId() {
  const value = process.env.AUXSOL_APP_ID?.trim();
  return value || undefined;
}

/**
 * Segredo da aplicação AUXSOL.
 * Preferência: AUXSOL_APP_SECRET.
 * Compatível: AUXSOL_SECRET_REF = nome de outra variável de ambiente (EnvSecretProvider).
 */
export function auxsolAppSecret(secrets = new EnvSecretProvider()) {
  const direct = process.env.AUXSOL_APP_SECRET?.trim();
  if (direct) return direct;
  return secrets.read(process.env.AUXSOL_SECRET_REF);
}

export function auxsolLiveCredentialsConfigured() {
  return Boolean(auxsolOfficialBaseUrl() && auxsolAppId() && auxsolAppSecret());
}

export function resolveAuxsolMode(): AuxsolRuntimeMode {
  if (auxsolMockAllowed()) return 'mock';
  if (auxsolOfficialBaseUrl()) return 'live';
  return 'blocked';
}

export function integrationLog(fields: Record<string, string | number | boolean | undefined>) {
  return { integration: 'auxsol', ...omitSensitiveKeys(fields) };
}
