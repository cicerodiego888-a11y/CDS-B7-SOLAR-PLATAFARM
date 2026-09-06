import { PrismaClient, UserRole, PlantStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('B7@123456', 12);

  const customer = await prisma.customer.upsert({
    where: { document: '00000000000100' },
    update: {},
    create: {
      name: 'B7 Solar - Cliente Piloto',
      document: '00000000000100',
      email: 'admin@b7solar.local',
      phone: '(88) 99999-0000',
      city: 'Juazeiro do Norte',
      state: 'CE',
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@b7solar.local' },
    update: {},
    create: {
      name: 'Administrador B7 Solar',
      email: 'admin@b7solar.local',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  await prisma.plant.upsert({
    where: { id: 'seed-plant-001' },
    update: {},
    create: {
      id: 'seed-plant-001',
      name: 'Usina Piloto B7 Solar',
      customerId: customer.id,
      status: PlantStatus.ACTIVE,
      installedPowerKw: 10,
      distributor: 'ENEL',
      consumerUnit: '000000000',
    },
  });
}

main().finally(() => prisma.$disconnect());