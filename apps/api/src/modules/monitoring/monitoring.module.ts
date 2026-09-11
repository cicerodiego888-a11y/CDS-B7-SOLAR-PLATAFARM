import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { AuthModule } from '../auth/auth.module';
import { MonitoringAccessService } from './monitoring.access';
import { MonitoringAvailabilityService } from './monitoring.availability.service';
import { MonitoringController } from './monitoring.controller';
import { MonitoringHistoryService } from './monitoring.history.service';
import { MonitoringService } from './monitoring.service';
import { MonitoringDiagnosisService } from './monitoring-diagnosis.service';

@Module({
  imports: [AlertsModule, AuthModule],
  controllers: [MonitoringController],
  providers: [MonitoringService, MonitoringHistoryService, MonitoringAccessService, MonitoringAvailabilityService, MonitoringDiagnosisService],
  exports: [MonitoringService, MonitoringHistoryService, MonitoringAccessService, MonitoringAvailabilityService, MonitoringDiagnosisService],
})
export class MonitoringModule {}
