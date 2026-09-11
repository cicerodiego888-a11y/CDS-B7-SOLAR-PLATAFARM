import assert from 'node:assert/strict';
import test from 'node:test';
import { configured, json, login, request, skipReason } from './client.ts';

test('diagnostics: overview autenticado suporta paginação', { skip: !configured ? skipReason() : false }, async () => {
  const auth = await login();
  const response = await request('/monitoring/diagnostics/overview?page=1&pageSize=10', {}, auth.accessToken);
  assert.equal(response.status, 200);
  const body = await json<{ page?: number; pageSize?: number; total: number; items?: unknown[] }>(response);
  assert.equal(body.page, 1);
  assert.equal(body.pageSize, 10);
  assert.equal(typeof body.total, 'number');
  assert.ok(Array.isArray(body.items));
});

test('diagnostics: recurso inexistente retorna 404', { skip: !configured ? skipReason() : false }, async () => {
  const auth = await login();
  assert.equal((await request('/monitoring/diagnostics/inverters/not-found', {}, auth.accessToken)).status, 404);
  assert.equal((await request('/monitoring/diagnostics/plants/not-found', {}, auth.accessToken)).status, 404);
});

test('diagnostics: detalhes de usina e inversor usam IDs de fixture', { skip: !configured || !process.env.E2E_PLANT_ID || !process.env.E2E_INVERTER_ID ? 'E2E_PLANT_ID e E2E_INVERTER_ID não configurados.' : false }, async () => {
  const auth = await login();
  const plant = await request(`/monitoring/diagnostics/plants/${process.env.E2E_PLANT_ID}`, {}, auth.accessToken);
  const inverter = await request(`/monitoring/diagnostics/inverters/${process.env.E2E_INVERTER_ID}`, {}, auth.accessToken);
  assert.ok(plant.status < 500);
  assert.ok(inverter.status < 500);
});
