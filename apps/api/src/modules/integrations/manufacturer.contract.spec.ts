import { createDefaultIntegrationEngine } from './integration.engine';
import { ManufacturersService } from './manufacturers.service';
import { EnvSecretProvider } from './secret.provider';
import { integrationLog } from './auxsol/auxsol.config';
import { normalizeAuxsolFixture } from './auxsol/auxsol.normalizer';
import { AUXSOL_FIXTURE_VALID } from './auxsol/auxsol.fixtures';
import { INTERNAL_NORMALIZED_READING, INTERNAL_READING_OPTIONAL_MISSING } from './contract.fixtures';
import { IntegrationCollectionService } from './collection/integration.collection.service';
import { CollectionError } from './collection/collection.errors';
import { validateNormalizedReading, sanitizeRawPayload } from './collection/reading.validator';
import { IntegrationQueueProcessor } from './queue/integration-queue.processor';
import { collectionFailed, integrationBlocked, integrationNotConfigured } from './collection/collection.errors';
import { aggregateEnergyHistory, chooseEnergySource } from '../monitoring/monitoring.energy';
import { HealthService } from '../health/health.service';
import { AuxsolIntegrationService } from './auxsol/auxsol.service';
import { MonitoringAlertService } from '../alerts/alert.engine';
import { InverterOfflineRule } from '../alerts/rules/status.rules';
import { ALERT_RULE } from '../alerts/alert.constants';

describe('Contrato interno de fabricantes', () => {
  const previous = { ...process.env };

  beforeEach(() => {
    delete process.env.AUXSOL_API_BASE_URL;
    process.env.AUXSOL_MOCK_MODE = 'false';
  });

  afterEach(() => {
    process.env = { ...previous };
  });

  it('1. fabricante sem contrato oficial permanece BLOCKED', () => {
    delete process.env.AUXSOL_API_BASE_URL;
    process.env.AUXSOL_MOCK_MODE = 'false';
    const auxsol = createDefaultIntegrationEngine().resolve('AUXSOL');
    expect(auxsol?.runtimeState()).toMatchObject({ mode: 'blocked', persistable: false });
  });

  it('2. fabricante sem binding permanece NOT_CONFIGURED', async () => {
    const prisma = {
      inverter: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'i1',
          plantId: 'p1',
          manufacturer: 'AUXSOL',
          manufacturerRef: { code: 'AUXSOL' },
          bindings: [],
          plant: { name: 'P' },
        }),
      },
      integrationBinding: { update: jest.fn() },
    };
    const persistence = { persist: jest.fn() };
    const service = new IntegrationCollectionService(prisma as never, persistence as never);
    await expect(service.collectInverter('i1')).rejects.toMatchObject({ code: 'INTEGRATION_NOT_CONFIGURED' });
    expect(persistence.persist).not.toHaveBeenCalled();
  });

  it('3. fabricante planejado não tenta HTTP inventado', async () => {
    const engine = createDefaultIntegrationEngine();
    const deye = engine.resolve('DEYE');
    expect(deye?.runtimeState()).toMatchObject({ mode: 'blocked', persistable: false, available: false });
    await expect(deye?.collect({})).resolves.toEqual([]);
    await expect(deye?.testConnection({})).resolves.toMatchObject({ ok: false, mode: 'blocked', supported: false });
  });

  it('4. IntegrationEngine resolve adapter pelo catálogo', () => {
    const engine = createDefaultIntegrationEngine();
    expect(engine.resolve('AUXSOL')?.provider).toBe('AUXSOL');
    expect(engine.resolve('SOLPLANET')?.provider).toBe('SOLPLANET');
    expect(engine.resolve('SAJ')?.provider).toBe('SAJ');
    expect(engine.resolve('HUAWEI')?.provider).toBe('HUAWEI');
    expect(engine.resolve('DEYE')?.provider).toBe('DEYE');
    expect(engine.resolve('CHINT')?.provider).toBe('CHINT');
    expect(engine.resolve('SUNGROW')?.provider).toBe('SUNGROW');
    expect(engine.listProviders()).toHaveLength(7);
  });

  it('5. adapter e overview não vazam segredo', () => {
    process.env.AUXSOL_SECRET_REF = 'AUXSOL_FAKE_SECRET';
    process.env.AUXSOL_FAKE_SECRET = 'super-secret-value';
    const overview = new ManufacturersService({} as never).engineOverview();
    const serialized = JSON.stringify(overview);
    expect(serialized).not.toContain('super-secret-value');
    expect(serialized).not.toMatch(/client_secret|apiKey|Authorization/i);
    expect(new EnvSecretProvider().has('AUXSOL_FAKE_SECRET')).toBe(true);
    expect(new EnvSecretProvider().read('AUXSOL_FAKE_SECRET')).toBe('super-secret-value');
  });

  it('6. payload externo não entra no domínio sem normalização', () => {
    const [reading] = normalizeAuxsolFixture(AUXSOL_FIXTURE_VALID);
    expect(reading).not.toHaveProperty('powerW');
    expect(reading).not.toHaveProperty('todayEnergyWh');
    expect(reading.powerKw).toBeDefined();
    expect(INTERNAL_NORMALIZED_READING).not.toHaveProperty('powerW');
  });

  it('7. timestamp inválido é rejeitado e não é inventado', () => {
    expect(validateNormalizedReading({ communicationOk: true })).toBe(false);
    expect(validateNormalizedReading({
      ...INTERNAL_NORMALIZED_READING,
      collectedAt: new Date('not-a-date'),
    })).toBe(false);
  });

  it('8. unidade inválida é rejeitada', () => {
    expect(validateNormalizedReading({ ...INTERNAL_NORMALIZED_READING, powerKw: Number.NaN })).toBe(false);
    expect(validateNormalizedReading({ ...INTERNAL_NORMALIZED_READING, energyTotalKwh: -1 })).toBe(false);
  });

  it('9. potência não vira energia no histórico', () => {
    expect(chooseEnergySource([{
      plantId: 'p1',
      inverterId: 'i1',
      collectedAt: INTERNAL_NORMALIZED_READING.collectedAt!,
    }])).toBe('NONE');
    expect(INTERNAL_NORMALIZED_READING.powerKw).toBe(12.4);
    expect(INTERNAL_NORMALIZED_READING.energyTotalKwh).not.toBe(INTERNAL_NORMALIZED_READING.powerKw);
  });

  it('10. energia acumulada pode alimentar histórico', () => {
    const from = new Date('2026-09-05T00:00:00.000Z');
    const to = new Date('2026-09-06T00:00:00.000Z');
    const result = aggregateEnergyHistory([
      { plantId: 'p1', inverterId: 'i1', collectedAt: new Date('2026-09-05T10:00:00.000Z'), energyTotalKwh: 15300 },
      {
        plantId: 'p1',
        inverterId: 'i1',
        collectedAt: INTERNAL_NORMALIZED_READING.collectedAt!,
        energyTotalKwh: INTERNAL_NORMALIZED_READING.energyTotalKwh,
      },
    ], { from, to, granularity: 'DAY' });
    expect(result.source).toBe('ENERGY_TOTAL');
    expect(result.energyKwh).toBeGreaterThan(0);
  });

  it('11. dados opcionais ausentes não quebram a validação', () => {
    expect(validateNormalizedReading(INTERNAL_READING_OPTIONAL_MISSING)).toBe(true);
  });

  it('12 e 13. erro de fabricante não derruba o worker; retry fica no BullMQ', async () => {
    const processor = new IntegrationQueueProcessor(
      {} as never,
      { collectInverter: jest.fn().mockRejectedValue(collectionFailed()) } as never,
    );
    await expect(processor.process({ data: { inverterId: 'i1' }, attemptsMade: 0 } as never))
      .rejects.toMatchObject({ code: 'COLLECTION_FAILED' });

    const blocked = new IntegrationQueueProcessor(
      {} as never,
      { collectInverter: jest.fn().mockRejectedValue(integrationBlocked()) } as never,
    );
    await expect(blocked.process({ data: { inverterId: 'i1' }, attemptsMade: 0 } as never))
      .resolves.toMatchObject({ ok: false, code: 'INTEGRATION_BLOCKED', persisted: 0 });
  });

  it('14. integração BLOCKED não persiste leitura', async () => {
    const prisma = {
      inverter: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'i1',
          plantId: 'p1',
          manufacturer: 'AUXSOL',
          manufacturerRef: { code: 'AUXSOL' },
          bindings: [{ id: 'b1', provider: 'AUXSOL' }],
          plant: { name: 'P' },
        }),
      },
      integrationBinding: { update: jest.fn().mockResolvedValue({}) },
    };
    const persistence = { persist: jest.fn() };
    const service = new IntegrationCollectionService(prisma as never, persistence as never);
    await expect(service.collectInverter('i1')).rejects.toBeInstanceOf(CollectionError);
    expect(persistence.persist).not.toHaveBeenCalled();
  });

  it('15. integração NOT_CONFIGURED não persiste leitura', async () => {
    const processor = new IntegrationQueueProcessor(
      {} as never,
      { collectInverter: jest.fn().mockRejectedValue(integrationNotConfigured()) } as never,
    );
    const result = await processor.process({ data: { inverterId: 'i1' }, attemptsMade: 0 } as never);
    expect(result).toMatchObject({ ok: false, code: 'INTEGRATION_NOT_CONFIGURED', persisted: 0 });
  });

  it('16 e 17. BLOCKED e NOT_CONFIGURED não criam alerta offline', () => {
    const engine = new MonitoringAlertService({} as never);
    expect(engine.resolveCollectability({
      manufacturer: 'AUXSOL',
      manufacturerRef: { code: 'AUXSOL' },
      bindings: [{ provider: 'AUXSOL', status: 'NOT_CONFIGURED' }],
    })).toBe('BLOCKED');
    expect(engine.resolveCollectability({
      manufacturer: 'AUXSOL',
      manufacturerRef: { code: 'AUXSOL' },
      bindings: [],
    })).toBe('NOT_CONFIGURED');
    const rule = new InverterOfflineRule();
    expect(rule.evaluate({
      inverterId: 'i1',
      collectability: 'BLOCKED',
      status: 'OFFLINE',
      readingValid: true,
    } as never)).toEqual({ action: 'skip' });
    expect(rule.evaluate({
      inverterId: 'i1',
      collectability: 'NOT_CONFIGURED',
      status: 'OFFLINE',
      readingValid: true,
    } as never)).toEqual({ action: 'skip' });
    expect(ALERT_RULE.INVERTER_OFFLINE).toBe('INVERTER_OFFLINE');
  });

  it('18. secrets não aparecem em logs', () => {
    const logged = integrationLog({
      operation: 'collect',
      token: 'abc',
      clientSecret: 'xyz',
      apiKey: 'key',
      inverterId: 'i1',
    });
    expect(JSON.stringify(logged)).not.toMatch(/abc|xyz|key/);
    expect(logged).toMatchObject({ operation: 'collect', inverterId: 'i1' });
    expect(sanitizeRawPayload({ Authorization: 'Bearer x', powerKw: 1 })).toEqual({ powerKw: 1 });
  });

  it('19. teste HTTP da API não devolve secret', async () => {
    process.env.AUXSOL_SECRET_REF = 'AUXSOL_FAKE_SECRET';
    process.env.AUXSOL_FAKE_SECRET = 'super-secret-value';
    const service = new AuxsolIntegrationService({} as never, {} as never);
    const result = await service.testConnection();
    expect(JSON.stringify(result)).not.toContain('super-secret-value');
    expect(result.mode).toBe('blocked');
  });

  it('20. browser não é o cliente do fabricante — overview só lista adapters internos', () => {
    const overview = new ManufacturersService({} as never).engineOverview();
    expect(overview.auxsol?.mode).toBe('blocked');
    expect(overview.adapters.every((item) => item.mode === 'blocked')).toBe(true);
  });

  it('health não trata AUXSOL BLOCKED como falha de infraestrutura', async () => {
    const health = new HealthService(
      { $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]) } as never,
      { ping: jest.fn().mockResolvedValue(true) } as never,
    );
    const result = await health.status();
    expect(result.status).toBe('ok');
    expect(result.integrations.AUXSOL).toBe('blocked');
    expect(result.integrations.DEYE).toBe('blocked');
  });
});
