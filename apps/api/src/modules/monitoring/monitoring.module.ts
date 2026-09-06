import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { MonitoringAccessService } from './monitoring.access';
import { MonitoringAvailabilityService } from './monitoring.availability.service';
import { MonitoringController } from './monitoring.controller';
import { MonitoringHistoryService } from './monitoring.history.service';
import { MonitoringService } from './monitoring.service';

@Module({
  imports: [AlertsModule],
  controllers: [MonitoringController],
  providers: [MonitoringService, MonitoringHistoryService, MonitoringAccessService, MonitoringAvailabilityService],
  exports: [MonitoringService, MonitoringHistoryService, MonitoringAccessService, MonitoringAvailabilityService],
})
export class MonitoringModule {}
