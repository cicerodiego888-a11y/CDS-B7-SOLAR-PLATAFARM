import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { IntegrationCollectionService } from '../collection/integration.collection.service';
import { createDefaultIntegrationEngine } from '../integration.engine';
import { EnvSecretProvider } from '../secret.provider';

@Injectable()
export class AuxsolIntegrationService {
  private readonly engine = createDefaultIntegrationEngine();
  private readonly secrets = new EnvSecretProvider();

  constructor(
    private readonly prisma: PrismaService,
    private readonly collection: IntegrationCollectionService,
  ) {}

  async testConnection() {
    const adapter = this.engine.resolve('AUXSOL');
    const started = Date.now();
    const result = await adapter?.testConnection({
      secretPresent: this.secrets.has(process.env.AUXSOL_SECRET_REF),
    });
    return {
      ok: result?.ok ?? false,
      supported: result?.supported ?? false,
      mode: result?.mode ?? 'blocked',
      message: result?.message ?? 'Adaptador AUXSOL não registrado no Motor de Integrações.',
      durationMs: Date.now() - started,
      mock: result?.mode === 'mock',
    };
  }

  async syncInverter(inverterId: string) {
    const inverter = await this.prisma.inverter.findUnique({
      where: { id: inverterId },
      include: { manufacturerRef: true },
    });
    if (!inverter) throw new NotFoundException('Inversor não encontrado.');
    const code = inverter.manufacturerRef?.code ?? inverter.manufacturer;
    if (code !== 'AUXSOL') {
      throw new BadRequestException('Este inversor não pertence ao fabricante AUXSOL.');
    }
    return this.collection.collectInverter(inverterId);
  }
}
