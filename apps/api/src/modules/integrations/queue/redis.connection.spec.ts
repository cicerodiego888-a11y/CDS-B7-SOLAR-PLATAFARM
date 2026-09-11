import { RedisConnectionService } from './redis.connection';

describe('RedisConnectionService locks', () => {
  it('adquire e libera com token de proprietário', async () => {
    const service = new RedisConnectionService() as any;
    const evalMock = jest.fn().mockResolvedValue(1);
    service.client = {
      status: 'ready',
      set: jest.fn().mockResolvedValue('OK'),
      eval: evalMock,
    };
    service.ready = true;
    const token = await service.acquireLock('collect-lock:i1', 1000);
    expect(token).toEqual(expect.any(String));
    expect(await service.releaseLock('collect-lock:i1', token)).toBe(true);
    expect(evalMock).toHaveBeenCalledWith(expect.stringContaining('redis.call'), 1, 'collect-lock:i1', token);
  });

  it('não adquire lock quando Redis está indisponível', async () => {
    const service = new RedisConnectionService();
    expect(await service.acquireLock('collect-lock:i1')).toBeNull();
  });
});