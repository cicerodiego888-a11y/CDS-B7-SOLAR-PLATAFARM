import assert from 'node:assert/strict';
import test from 'node:test';
import { configured, login, request, skipReason } from './client.ts';

test('access-control: token inválido retorna 401', { skip: !configured ? skipReason() : false }, async () => {
  assert.equal((await request('/monitoring/overview', {}, 'invalid-token')).status, 401);
});

test('access-control: customer isolation usa fixture explícita', { skip: !configured ? skipReason() : false }, async () => {
  const auth = await login();
  if (!process.env.E2E_OTHER_PLANT_ID) return;
  assert.equal((await request(`/monitoring/plants/${process.env.E2E_OTHER_PLANT_ID}/history`, {}, auth.accessToken)).status, 403);
});
