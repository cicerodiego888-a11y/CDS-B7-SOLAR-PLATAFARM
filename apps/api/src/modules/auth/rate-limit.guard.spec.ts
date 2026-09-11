import { HttpException } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard';

function context(path: string, method = 'POST') {
  return { switchToHttp: () => ({ getRequest: () => ({ originalUrl: path, method, ip: '127.0.0.1' }) }) } as any;
}

describe('RateLimitGuard', () => {
  it('limita login usando Redis', async () => {
    const redis = { isReady: () => true, consumeRateLimit: jest.fn().mockResolvedValue({ allowed: false, count: 11 }) };
    const guard = new RateLimitGuard(redis as never);
    await expect(guard.canActivate(context('/api/auth/login'))).rejects.toMatchObject({ constructor: HttpException, status: 429 });
  });

  it('não limita polling de monitoramento', async () => {
    const redis = { isReady: () => true, consumeRateLimit: jest.fn() };
    const guard = new RateLimitGuard(redis as never);
    await expect(guard.canActivate(context('/api/monitoring/overview', 'GET'))).resolves.toBe(true);
    expect(redis.consumeRateLimit).not.toHaveBeenCalled();
  });
});