import { omitSensitiveKeys } from '../security.redact';

export type AuxsolRuntimeMode = 'live' | 'mock' | 'blocked';

export function auxsolTimeoutMs() {
  const parsed = Number(process.env.AUXSOL_API_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10000;
}

export function auxsolMaxRetries() {
  const parsed = Number(process.env.AUXSOL_HTTP_MAX_RETRIES);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.min(parsed, 3) : 2;
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

export function resolveAuxsolMode(): AuxsolRuntimeMode {
  if (auxsolMockAllowed()) return 'mock';
  if (auxsolOfficialBaseUrl()) return 'live';
  return 'blocked';
}

export function integrationLog(fields: Record<string, string | number | boolean | undefined>) {
  return { integration: 'auxsol', ...omitSensitiveKeys(fields) };
}
