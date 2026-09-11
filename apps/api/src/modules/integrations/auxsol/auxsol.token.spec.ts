import { AUXSOL_AUTH_TOKEN_PATH, AUXSOL_SUCCESS_CODE } from './auxsol.config';
import { AuxsolTokenManager } from './auxsol.token';

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
  } as Response;
}

describe('AuxsolTokenManager', () => {
  it('reutiliza token em cache enquanto válido', async () => {
    let now = 1_000_000;
    const fetchImpl = jest.fn(async () => jsonResponse(200, {
      code: AUXSOL_SUCCESS_CODE,
      msg: null,
      data: { access_token: 'cached-token', expires_in: 100 },
    }));
    const manager = new AuxsolTokenManager({
      baseUrl: 'https://auxsol.example.test',
      appId: 'id',
      appSecret: 'secret',
      fetchImpl: fetchImpl as never,
      refreshMarginMs: 10_000,
      now: () => now,
    });

    await expect(manager.getAccessToken()).resolves.toBe('cached-token');
    await expect(manager.getAccessToken()).resolves.toBe('cached-token');
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    now += 80_000; // ainda dentro de expires_in (100s) - margin (10s) = 90s
    await expect(manager.getAccessToken()).resolves.toBe('cached-token');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('renova token quando expires_in (menos margem) é ultrapassado', async () => {
    let now = 0;
    let calls = 0;
    const fetchImpl = jest.fn(async () => {
      calls += 1;
      return jsonResponse(200, {
        code: AUXSOL_SUCCESS_CODE,
        msg: null,
        data: { access_token: `token-${calls}`, expires_in: 30 },
      });
    });
    const manager = new AuxsolTokenManager({
      baseUrl: 'https://auxsol.example.test',
      appId: 'id',
      appSecret: 'secret',
      fetchImpl: fetchImpl as never,
      refreshMarginMs: 5_000,
      now: () => now,
    });

    await expect(manager.getAccessToken()).resolves.toBe('token-1');
    now += 26_000; // 30s - 5s margin = 25s → precisa renovar
    await expect(manager.getAccessToken()).resolves.toBe('token-2');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('requisições concorrentes compartilham um único POST /auth/token', async () => {
    let resolveFetch!: (value: Response) => void;
    const fetchImpl = jest.fn(async (url: string | URL) => {
      expect(String(url)).toContain(AUXSOL_AUTH_TOKEN_PATH);
      return new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });
    });
    const manager = new AuxsolTokenManager({
      baseUrl: 'https://auxsol.example.test',
      appId: 'id',
      appSecret: 'secret',
      fetchImpl: fetchImpl as never,
      refreshMarginMs: 1_000,
      now: () => 0,
    });

    const pending = Promise.all([
      manager.getAccessToken(),
      manager.getAccessToken(),
      manager.getAccessToken(),
    ]);

    await Promise.resolve();
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    resolveFetch(jsonResponse(200, {
      code: AUXSOL_SUCCESS_CODE,
      msg: null,
      data: { access_token: 'shared-token', expires_in: 43200 },
    }));

    await expect(pending).resolves.toEqual(['shared-token', 'shared-token', 'shared-token']);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
