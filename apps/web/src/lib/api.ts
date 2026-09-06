import { getAccessToken, notifyUnauthorized } from './auth-session';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (response.status === 401) {
    notifyUnauthorized();
    throw new ApiError(401, 'Sua sessão expirou. Entre novamente.');
  }
  if (response.status === 403) {
    throw new ApiError(403, 'Você não possui permissão para acessar este recurso.');
  }
  if (!response.ok) {
    throw new ApiError(response.status, await readApiMessage(response, 'Falha ao consultar a API'));
  }
  return response.json() as Promise<T>;
}

async function readApiMessage(response: Response, fallback: string) {
  const body = await response.clone().json().catch(() => null) as { message?: string | string[] } | null;
  if (Array.isArray(body?.message)) return body.message.join(' ');
  if (typeof body?.message === 'string') return body.message;
  return fallback;
}

export async function loginRequest(email: string, password: string) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new ApiError(response.status, 'Usuário ou senha inválidos.');
  }
  return response.json() as Promise<{ accessToken: string; user: import('./auth-session').AuthUser }>;
}
