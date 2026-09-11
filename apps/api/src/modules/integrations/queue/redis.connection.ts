import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import { redisConnectionOptions } from './integration-queue.constants';

export function bullmqConnection() {
  return {
    ...redisConnectionOptions(),
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  };
}

@Injectable()
export class RedisConnectionService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null;
  private ready = false;

  async onModuleInit() {
    const client = new Redis({
      ...bullmqConnection(),
      lazyConnect: true,
    });
    client.on('ready', () => {
      this.ready = true;
    });
    client.on('end', () => {
      this.ready = false;
    });
    client.on('error', () => {
      this.ready = false;
    });
    this.client = client;
    try {
      await client.connect();
      this.ready = client.status === 'ready';
    } catch {
      this.ready = false;
    }
  }

  async onModuleDestroy() {
    await this.client?.quit().catch(() => this.client?.disconnect());
    this.client = null;
    this.ready = false;
  }

  isReady() {
    return this.ready && this.client?.status === 'ready';
  }

  async ping() {
    if (!this.client) return false;
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  async acquireLock(key: string, ttlMs = 30_000) {
    if (!this.client || !this.isReady()) return null;
    const token = randomUUID();
    const acquired = await this.client.set(key, token, 'PX', ttlMs, 'NX');
    return acquired === 'OK' ? token : null;
  }

  async releaseLock(key: string, token: string) {
    if (!this.client || !this.isReady()) return false;
    const released = await this.client.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      1,
      key,
      token,
    );
    return released === 1;
  }

  async consumeRateLimit(key: string, limit: number, windowMs: number) {
    if (!this.client || !this.isReady()) return null;
    const count = await this.client.incr(key);
    if (count === 1) await this.client.pexpire(key, windowMs);
    return { allowed: count <= limit, count };
  }
}
