import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
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
}
