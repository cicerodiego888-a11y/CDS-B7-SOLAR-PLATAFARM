import assert from 'node:assert/strict';
import test from 'node:test';
import { configured, json, login, request, skipReason } from './client.ts';

test('monitoring: overview autenticado retorna período e estrutura', { skip: !configured ? skipReason() : false }, async () => {
  const auth = await login();
  const response = await request('/monitoring/overview?period=today', {}, auth.accessToken);
  assert.equal(response.status, 200);
  const body = await json<{ period: string; dashboard: unknown }>(response);
  assert.equal(body.period, 'today');
  assert.ok(body.dashboard);
});

test('monitoring: history e availability exigem autenticação', { skip: !configured ? skipReason() : false }, async () => {
  assert.equal((await request('/monitoring/history')).status, 401);
  assert.equal((await request('/monitoring/availability')).status, 401);
});

test('monitoring: history e availability por recurso usam IDs de fixture', { skip: !configured || !process.env.E2E_PLANT_ID || !process.env.E2E_INVERTER_ID ? 'E2E_PLANT_ID e E2E_INVERTER_ID não configurados.' : false }, async () => {
  const auth = await login();
  const paths = [
    `/monitoring/plants/${process.env.E2E_PLANT_ID}/history?period=today`,
    `/monitoring/inverters/${process.env.E2E_INVERTER_ID}/history?period=today`,
    `/monitoring/plants/${process.env.E2E_PLANT_ID}/availability?period=today`,
    `/monitoring/inverters/${process.env.E2E_INVERTER_ID}/availability?period=today`,
  ];
  for (const path of paths) assert.ok((await request(path, {}, auth.accessToken)).status < 500);
});
