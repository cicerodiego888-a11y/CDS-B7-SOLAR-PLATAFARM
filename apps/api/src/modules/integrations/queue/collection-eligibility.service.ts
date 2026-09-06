import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class CollectionEligibilityService {
  constructor(private readonly prisma: PrismaService) {}

  async listEligibleInverterIds() {
    const inverters = await this.prisma.inverter.findMany({
      where: { status: { not: 'INACTIVE' } },
      include: { manufacturerRef: true, bindings: true },
    });
    return inverters.filter(isEligibleInverter).map((item) => item.id);
  }
}

export function isEligibleInverter(inverter: {
  status?: string | null;
  manufacturer: string;
  manufacturerRef?: { code: string } | null;
  bindings: Array<{ provider: string }>;
}) {
  if (inverter.status === 'INACTIVE') return false;
  const manufacturer = inverter.manufacturerRef?.code ?? inverter.manufacturer;
  return inverter.bindings.some((binding) => binding.provider === manufacturer);
}
