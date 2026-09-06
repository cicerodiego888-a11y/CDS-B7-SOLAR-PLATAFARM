export type InverterManufacturerCode =
  | 'AUXSOL'
  | 'SOLPLANET'
  | 'SAJ'
  | 'HUAWEI'
  | 'DEYE'
  | 'CHINT'
  | 'SUNGROW';

export type ManufacturerIntegrationStatus = 'PLANNED' | 'READY' | 'ACTIVE';

export interface InverterManufacturerDefinition {
  code: InverterManufacturerCode;
  name: string;
  active: boolean;
  integrationStatus: ManufacturerIntegrationStatus;
  capabilities: {
    telemetry: boolean;
    alerts: boolean;
    remoteControl: boolean;
  };
}

export const OFFICIAL_INVERTER_MANUFACTURERS: InverterManufacturerDefinition[] = [
  { code: 'AUXSOL', name: 'Auxsol', active: true, integrationStatus: 'READY', capabilities: { telemetry: true, alerts: true, remoteControl: false } },
  { code: 'SOLPLANET', name: 'Solplanet', active: true, integrationStatus: 'PLANNED', capabilities: { telemetry: true, alerts: true, remoteControl: false } },
  { code: 'SAJ', name: 'SAJ', active: true, integrationStatus: 'PLANNED', capabilities: { telemetry: true, alerts: true, remoteControl: false } },
  { code: 'HUAWEI', name: 'Huawei', active: true, integrationStatus: 'PLANNED', capabilities: { telemetry: true, alerts: true, remoteControl: false } },
  { code: 'DEYE', name: 'Deye', active: true, integrationStatus: 'PLANNED', capabilities: { telemetry: true, alerts: true, remoteControl: false } },
  { code: 'CHINT', name: 'Chint', active: true, integrationStatus: 'PLANNED', capabilities: { telemetry: true, alerts: true, remoteControl: false } },
  { code: 'SUNGROW', name: 'Sungrow', active: true, integrationStatus: 'PLANNED', capabilities: { telemetry: true, alerts: true, remoteControl: false } },
];

const manufacturerByCode = new Map(
  OFFICIAL_INVERTER_MANUFACTURERS.map((manufacturer) => [manufacturer.code, manufacturer]),
);

export function getInverterManufacturer(code: string) {
  return manufacturerByCode.get(code as InverterManufacturerCode);
}

export function getInverterManufacturerName(code: string) {
  return getInverterManufacturer(code)?.name ?? code;
}
