import { HealthService } from './health.service';

describe('HealthService', () => {
  it('marca Redis indisponível sem mascarar a falha', async () => {
    const service = new HealthService(
      { $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]) } as never,
      { ping: jest.fn().mockResolvedValue(false) } as never,
    );
    const result = await service.status();
    expect(result.api).toBe('ok');
    expect(result.database).toBe('ok');
    expect(result.redis).toBe('down');
    expect(result.status).toBe('degraded');
    expect(JSON.stringify(result)).not.toMatch(/password|token|secret/i);
  });

  it('retorna ok quando API, banco e Redis respondem', async () => {
    delete process.env.AUXSOL_API_BASE_URL;
    process.env.AUXSOL_MOCK_MODE = 'false';
    const service = new HealthService(
      { $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]) } as never,
      { ping: jest.fn().mockResolvedValue(true) } as never,
    );
    const result = await service.status();
    expect(result).toMatchObject({
      status: 'ok',
      api: 'ok',
      database: 'ok',
      redis: 'ok',
    });
    expect(result.integrations.AUXSOL).toBe('blocked');
  });
});
