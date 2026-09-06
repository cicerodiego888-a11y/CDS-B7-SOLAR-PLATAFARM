import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { HealthModule } from '../health/health.module';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';

@Module({
  imports: [MonitoringModule, AlertsModule, HealthModule],
  controllers: [OperationsController],
  providers: [OperationsService],
})
export class OperationsModule {}
