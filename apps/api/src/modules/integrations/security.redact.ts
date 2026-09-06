export const SENSITIVE_FIELD_KEY = /password|token|authorization|cookie|secret|credential|apikey|api[_-]?key/i;

export function omitSensitiveKeys(fields: Record<string, string | number | boolean | undefined>) {
  return Object.fromEntries(
    Object.entries(fields).filter(([key, value]) => value !== undefined && !SENSITIVE_FIELD_KEY.test(key)),
  );
}

export function stripSensitiveObject(payload: unknown) {
  if (!payload || typeof payload !== 'object') return payload;
  const clone = JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
  for (const key of Object.keys(clone)) {
    if (SENSITIVE_FIELD_KEY.test(key)) delete clone[key];
  }
  return clone;
}
