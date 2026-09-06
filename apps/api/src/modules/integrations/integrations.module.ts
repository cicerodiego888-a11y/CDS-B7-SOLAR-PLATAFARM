import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { AuxsolController } from './auxsol/auxsol.controller';
import { AuxsolIntegrationService } from './auxsol/auxsol.service';
import { CollectionController } from './collection/collection.controller';
import { IntegrationCollectionService } from './collection/integration.collection.service';
import { MonitoringPersistenceService } from './collection/monitoring.persistence.service';
import { ManufacturersController } from './manufacturers.controller';
import { ManufacturersService } from './manufacturers.service';
import { CollectionEligibilityService } from './queue/collection-eligibility.service';
import { IntegrationCollectionScheduler } from './queue/integration-collection.scheduler';
import { IntegrationQueueProcessor } from './queue/integration-queue.processor';
import { IntegrationQueueService } from './queue/integration-queue.service';
import { RedisConnectionService } from './queue/redis.connection';

@Module({
  imports: [AlertsModule],
  controllers: [ManufacturersController, AuxsolController, CollectionController],
  providers: [
    ManufacturersService,
    AuxsolIntegrationService,
    IntegrationCollectionService,
    MonitoringPersistenceService,
    RedisConnectionService,
    IntegrationQueueService,
    IntegrationQueueProcessor,
    CollectionEligibilityService,
    IntegrationCollectionScheduler,
  ],
  exports: [
    ManufacturersService,
    AuxsolIntegrationService,
    IntegrationCollectionService,
    RedisConnectionService,
    IntegrationQueueService,
  ],
})
export class IntegrationsModule {}
