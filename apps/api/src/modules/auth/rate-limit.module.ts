import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { IntegrationsModule } from '../integrations/integrations.module';
import { RateLimitGuard } from './rate-limit.guard';

@Module({
  imports: [IntegrationsModule],
  providers: [RateLimitGuard, { provide: APP_GUARD, useClass: RateLimitGuard }],
})
export class RateLimitModule {}