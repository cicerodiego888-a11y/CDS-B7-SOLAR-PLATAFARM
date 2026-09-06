export type PlantStatus = 'ACTIVE' | 'INACTIVE' | 'WARNING' | 'OFFLINE';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface PlantSummary {
  id: string;
  name: string;
  status: PlantStatus;
  installedPowerKw?: number;
  generationTodayKwh?: number;
  generationMonthKwh?: number;
}