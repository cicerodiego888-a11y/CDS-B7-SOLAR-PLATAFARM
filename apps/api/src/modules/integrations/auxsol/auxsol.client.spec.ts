import { AuxsolClient } from './auxsol.client';
import { AuxsolAuthError, AuxsolTransientError } from './auxsol.errors';

describe('AuxsolClient', () => {
  it('faz retry apenas em erro transitório', async () => {
    process.env.AUXSOL_HTTP_MAX_RETRIES = '2';
    let calls = 0;
    const client = new AuxsolClient({
      mode: 'mock',
      execute: async () => {
        calls += 1;
        if (calls < 3) throw new AuxsolTransientError('timeout');
        return { ok: true };
      },
    });
    await expect(client.testConnection({})).resolves.toEqual({ ok: true });
    expect(calls).toBe(3);
    delete process.env.AUXSOL_HTTP_MAX_RETRIES;
  });

  it('não faz retry em autenticação inválida', async () => {
    let calls = 0;
    const client = new AuxsolClient({
      mode: 'mock',
      execute: async () => {
        calls += 1;
        throw new AuxsolAuthError();
      },
    });
    await expect(client.collect({})).rejects.toBeInstanceOf(AuxsolAuthError);
    expect(calls).toBe(1);
  });
});
