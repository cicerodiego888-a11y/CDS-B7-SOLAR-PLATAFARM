import { PrismaClient, AlertSeverity, AlertStatus, PlantStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { OFFICIAL_INVERTER_MANUFACTURERS } from '../src/modules/integrations/manufacturers.catalog';

const prisma = new PrismaClient();
const password = process.env.E2E_SEED_PASSWORD || 'e2e-only-change-me';

async function main() {
  await prisma.alertEvent.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.monitoringReading.deleteMany();
  await prisma.integrationBinding.deleteMany();
  await prisma.inverter.deleteMany();
  await prisma.plant.deleteMany();
  await prisma.user.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.inverterManufacturer.deleteMany();

  const passwordHash = await bcrypt.hash(password, 10);
  const [customerA, customerB] = await Promise.all([
    prisma.customer.create({ data: { id: 'e2e-customer-a', name: 'E2E Customer A', document: '99999999999901', email: 'customer-a@e2e.invalid' } }),
    prisma.customer.create({ data: { id: 'e2e-customer-b', name: 'E2E Customer B', document: '99999999999902', email: 'customer-b@e2e.invalid' } }),
  ]);
  await prisma.user.createMany({ data: [
    { id: 'e2e-admin', name: 'E2E Admin', email: 'admin@e2e.invalid', passwordHash, role: UserRole.ADMIN },
    { id: 'e2e-operator', name: 'E2E Operator', email: 'operator@e2e.invalid', passwordHash, role: UserRole.OPERATOR },
    { id: 'e2e-customer-a-user', name: 'E2E Customer A User', email: 'customer-a-user@e2e.invalid', passwordHash, role: UserRole.CUSTOMER, customerId: customerA.id },
    { id: 'e2e-customer-b-user', name: 'E2E Customer B User', email: 'customer-b-user@e2e.invalid', passwordHash, role: UserRole.CUSTOMER, customerId: customerB.id },
  ] });

  for (const manufacturer of OFFICIAL_INVERTER_MANUFACTURERS) {
    await prisma.inverterManufacturer.create({
      data: {
        id: `e2e-manufacturer-${manufacturer.code.toLowerCase()}`,
        code: manufacturer.code,
        name: manufacturer.name,
        active: manufacturer.active,
        integrationStatus: manufacturer.integrationStatus,
        capabilities: manufacturer.capabilities,
      },
    });
  }
  const auxsol = await prisma.inverterManufacturer.findUniqueOrThrow({ where: { code: 'AUXSOL' } });
  const solplanet = await prisma.inverterManufacturer.findUniqueOrThrow({ where: { code: 'SOLPLANET' } });
  const plantA = await prisma.plant.create({ data: { id: 'e2e-plant-a', name: 'E2E Plant A', customerId: customerA.id, status: PlantStatus.ACTIVE, installedPowerKw: 80 } });
  const plantB = await prisma.plant.create({ data: { id: 'e2e-plant-b', name: 'E2E Plant B', customerId: customerB.id, status: PlantStatus.ACTIVE, installedPowerKw: 50 } });
  const inverterA = await prisma.inverter.create({ data: { id: 'e2e-inverter-a', plantId: plantA.id, manufacturer: 'AUXSOL', manufacturerId: auxsol.id, model: 'E2E-INV-A', serialNumber: 'E2E-SERIAL-A', ratedPowerKw: 50 } });
  const inverterB = await prisma.inverter.create({ data: { id: 'e2e-inverter-b', plantId: plantB.id, manufacturer: 'SOLPLANET', manufacturerId: solplanet.id, model: 'E2E-INV-B', serialNumber: 'E2E-SERIAL-B', ratedPowerKw: 30 } });
  await prisma.integrationBinding.createMany({ data: [
    { id: 'e2e-binding-a', inverterId: inverterA.id, provider: 'AUXSOL', manufacturerId: auxsol.id, status: 'NOT_CONFIGURED' },
    { id: 'e2e-binding-b', inverterId: inverterB.id, provider: 'SOLPLANET', manufacturerId: solplanet.id, status: 'READY' },
  ] });
  await prisma.monitoringReading.createMany({ data: [
    { id: 'e2e-reading-a', plantId: plantA.id, inverterId: inverterA.id, collectedAt: new Date('2026-09-07T12:00:00Z'), powerKw: 0, energyTodayKwh: 0, communicationOk: true, sourceProvider: 'E2E', idempotencyKey: 'e2e-reading-a', rawPayload: { normalizedStatus: 'ONLINE' } },
    { id: 'e2e-reading-b', plantId: plantB.id, inverterId: inverterB.id, collectedAt: new Date('2026-09-07T11:00:00Z'), powerKw: 0, communicationOk: false, sourceProvider: 'E2E', idempotencyKey: 'e2e-reading-b', rawPayload: { normalizedStatus: 'OFFLINE' } },
  ] });
  await prisma.alert.create({ data: {
    id: 'e2e-alert-b-offline', plantId: plantB.id, inverterId: inverterB.id, severity: AlertSeverity.CRITICAL, status: AlertStatus.OPEN,
    type: 'INVERTER_OFFLINE', ruleCode: 'INVERTER_OFFLINE', fingerprint: 'INVERTER_OFFLINE:e2e-inverter-b', title: 'Inversor sem comunicação', occurredAt: new Date('2026-09-07T11:05:00Z'),
    events: { create: { type: 'ALERT_CREATED', actor: 'E2E_SEED' } },
  } });
}

main().finally(() => prisma.$disconnect());
