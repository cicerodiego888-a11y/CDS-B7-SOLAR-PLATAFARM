import { Module } from '@nestjs/common';
import { MonitoringAlertService } from './alert.engine';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';

@Module({
  controllers: [AlertsController],
  providers: [AlertsService, MonitoringAlertService],
  exports: [AlertsService, MonitoringAlertService],
})
export class AlertsModule {}
