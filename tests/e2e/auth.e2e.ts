import assert from 'node:assert/strict';
import test from 'node:test';
import { configured, json, login, request, skipReason } from './client.ts';

test('auth: login inválido retorna 401', { skip: !configured ? skipReason() : false }, async () => {
  const response = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'invalid@example.test', password: 'invalid-password' }) });
  assert.equal(response.status, 401);
});

test('auth: login válido retorna token e usuário público', { skip: !configured ? skipReason() : false }, async () => {
  const result = await login();
  assert.ok(result.accessToken);
  assert.ok(result.user);
});

test('auth: rota protegida sem token retorna 401', { skip: !configured ? skipReason() : false }, async () => {
  const response = await request('/monitoring/overview');
  assert.equal(response.status, 401);
  const body = await json<{ requestId?: string }>(response);
  assert.ok(body.requestId);
});
