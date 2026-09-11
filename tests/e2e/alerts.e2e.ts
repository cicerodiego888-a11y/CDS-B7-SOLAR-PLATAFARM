import assert from 'node:assert/strict';
import test from 'node:test';
import { configured, login, request, skipReason } from './client.ts';

test('alerts: listagem e detalhes exigem autenticação', { skip: !configured ? skipReason() : false }, async () => {
  assert.equal((await request('/alerts')).status, 401);
  assert.equal((await request('/alerts/not-found')).status, 401);
});

test('alerts: listagem autenticada usa a API oficial', { skip: !configured ? skipReason() : false }, async () => {
  const auth = await login();
  const response = await request('/alerts', {}, auth.accessToken);
  assert.equal(response.status, 200);
});

test('alerts: lifecycle acknowledge e resolve usa fixture controlada', { skip: !configured || !process.env.E2E_ALERT_ID ? 'E2E_ALERT_ID não configurado.' : false }, async () => {
  const auth = await login();
  const id = process.env.E2E_ALERT_ID!;
  const acknowledged = await request(`/alerts/${id}/acknowledge`, { method: 'POST' }, auth.accessToken);
  assert.ok([200, 201, 422].includes(acknowledged.status));
  if (acknowledged.status === 422) return;
  const resolved = await request(`/alerts/${id}/resolve`, { method: 'PATCH' }, auth.accessToken);
  assert.ok([200, 422].includes(resolved.status));
});
