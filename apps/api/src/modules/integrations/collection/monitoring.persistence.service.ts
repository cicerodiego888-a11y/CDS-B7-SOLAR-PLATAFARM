import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { NormalizedMonitoringData } from '../integration.contract';
import { buildIdempotencyKey, sanitizeRawPayload, validateNormalizedReading } from './reading.validator';

@Injectable()
export class MonitoringPersistenceService {
  constructor(private readonly prisma: PrismaService) {}

  async persist(
    plantId: string,
    inverterId: string,
    provider: string,
    readings: NormalizedMonitoringData[],
  ) {
    const valid = readings.filter(validateNormalizedReading);
    const skipped = readings.length - valid.length;
    if (!valid.length) {
      return { persisted: 0, skipped, valid: 0 };
    }

    let persisted = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const reading of valid) {
        const idempotencyKey = buildIdempotencyKey(provider, inverterId, reading);
        const exists = await this.findExisting(tx, inverterId, provider, reading, idempotencyKey);
        if (exists) continue;
        try {
          await tx.monitoringReading.create({
            data: {
              plantId,
              inverterId,
              collectedAt: reading.collectedAt as Date,
              powerKw: reading.powerKw,
              energyTodayKwh: reading.energyTodayKwh,
              energyMonthKwh: reading.energyMonthKwh,
              energyTotalKwh: reading.energyTotalKwh,
              communicationOk: reading.communicationOk,
              sourceProvider: provider,
              idempotencyKey,
              rawPayload: sanitizeRawPayload({
                ...(reading.rawPayload && typeof reading.rawPayload === 'object' ? reading.rawPayload as Record<string, unknown> : {}),
                normalizedStatus: reading.status,
              }) as Prisma.InputJsonValue,
            },
          });
        } catch (error) {
          if (!isUniqueConstraintError(error)) throw error;
          continue;
        }
        persisted += 1;
      }
    });

    return { persisted, skipped, valid: valid.length };
  }

  private findExisting(
    tx: Prisma.TransactionClient,
    inverterId: string,
    provider: string,
    reading: NormalizedMonitoringData,
    idempotencyKey?: string,
  ) {
    return tx.monitoringReading.findFirst({
      where: {
        inverterId,
        OR: [
          ...(idempotencyKey ? [{ idempotencyKey }] : []),
          {
            sourceProvider: provider,
            collectedAt: reading.collectedAt,
          },
        ],
      },
    });
  }
}

function isUniqueConstraintError(error: unknown): error is { code: 'P2002' } {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === 'P2002');
}
