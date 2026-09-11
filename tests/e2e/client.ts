import assert from 'node:assert/strict';

export const baseUrl = (process.env.E2E_BASE_URL || 'http://localhost:3001/api').replace(/\/$/, '');
export const configured = Boolean(process.env.E2E_BASE_URL);

export async function request(path: string, init: RequestInit = {}, token?: string) {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(`${baseUrl}${path}`, { ...init, headers });
}

export async function json<T>(response: Response) {
  return response.json() as Promise<T>;
}

export async function login() {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  assert.ok(email && password, 'E2E_EMAIL e E2E_PASSWORD são obrigatórios para testes autenticados.');
  const response = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 201);
  return json<{ accessToken: string; user: { permissions: string[] } }>(response);
}

export function skipReason() {
  return 'E2E_BASE_URL não configurado; configure um ambiente E2E isolado para executar os testes.';
}
