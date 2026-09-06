import { Controller, Get, Param, Post } from '@nestjs/common';
import { Permissions } from '../../auth/permissions.decorator';
import { IntegrationQueueService } from '../queue/integration-queue.service';
import { IntegrationCollectionService } from './integration.collection.service';

@Controller('integrations')
export class CollectionController {
  constructor(
    private readonly collection: IntegrationCollectionService,
    private readonly queue: IntegrationQueueService,
  ) {}

  @Permissions('SETTINGS_VIEW')
  @Post('collect/:inverterId')
  collect(@Param('inverterId') inverterId: string) {
    return this.collection.collectInverter(inverterId);
  }

  @Permissions('SETTINGS_VIEW')
  @Get('queue')
  queueSnapshot() {
    return this.queue.snapshot();
  }
}
