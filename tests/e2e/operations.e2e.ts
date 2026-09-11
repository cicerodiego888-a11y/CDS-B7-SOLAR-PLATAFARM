import assert from 'node:assert/strict';
import test from 'node:test';
import { configured, json, login, request, skipReason } from './client.ts';

test('operations: Central de Operação retorna overview', { skip: !configured ? skipReason() : false }, async () => {
  const auth = await login();
  const response = await request('/operations/overview?period=today', {}, auth.accessToken);
  assert.equal(response.status, 200);
  const body = await json<{ summary: unknown; plants: unknown[]; alerts: unknown[] }>(response);
  assert.ok(body.summary);
  assert.ok(Array.isArray(body.plants));
  assert.ok(Array.isArray(body.alerts));
});
