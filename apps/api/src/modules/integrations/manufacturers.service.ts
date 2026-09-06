import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { createDefaultIntegrationEngine } from './integration.engine';
import { OFFICIAL_INVERTER_MANUFACTURERS } from './manufacturers.catalog';

@Injectable()
export class ManufacturersService {
  private readonly engine = createDefaultIntegrationEngine();

  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.inverterManufacturer.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }

  engineOverview() {
    const adapters = this.engine.listProviders().map((code) => {
      const adapter = this.engine.resolve(code);
      const runtime = adapter?.runtimeState();
      return {
        provider: code,
        mode: runtime?.mode ?? 'blocked',
        persistable: runtime?.persistable ?? false,
        available: runtime?.available ?? false,
        capabilities: adapter?.capabilities() ?? [],
      };
    });
    const auxsol = adapters.find((item) => item.provider === 'AUXSOL') ?? null;
    return {
      motor: 'Motor de Integrações',
      providers: this.engine.listProviders(),
      catalog: OFFICIAL_INVERTER_MANUFACTURERS.map((manufacturer) => manufacturer.code),
      adapters,
      auxsol,
    };
  }
}
