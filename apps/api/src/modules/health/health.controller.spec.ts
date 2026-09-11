import { HealthService } from './health.service';
import { HealthController } from './health.module';
import { ServiceUnavailableException } from '@nestjs/common';

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

  it('liveness não depende de banco, Redis ou fabricante', () => {
    const controller = new HealthController({} as never);
    expect(controller.live().status).toBe('ok');
  });

  it('readiness falha quando Redis está indisponível', async () => {
    const controller = new HealthController({
      status: jest.fn().mockResolvedValue({ database: 'ok', redis: 'down', status: 'degraded' }),
    } as never);
    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('readiness retorna ready com banco e Redis disponíveis', async () => {
    const controller = new HealthController({
      status: jest.fn().mockResolvedValue({ database: 'ok', redis: 'ok', status: 'ok' }),
    } as never);
    await expect(controller.ready()).resolves.toMatchObject({ status: 'ready', database: 'ok', redis: 'ok' });
  });
});
