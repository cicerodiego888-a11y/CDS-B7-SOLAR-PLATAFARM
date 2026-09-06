import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateEquipmentDto, StatusDto, UpdateEquipmentDto } from '../common/dto';

const include = { plant: { include: { customer: true } }, inverter: true };

@Injectable()
export class EquipmentService {
  constructor(private prisma: PrismaService) {}

  findAll(filters?: { plantId?: string; type?: string; status?: string }) {
    return this.prisma.equipment.findMany({
      where: {
        ...(filters?.plantId ? { plantId: filters.plantId } : {}),
        ...(filters?.type ? { type: filters.type as never } : {}),
        ...(filters?.status ? { status: filters.status as never } : {}),
      },
      include,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.equipment.findUnique({ where: { id }, include });
    if (!item) throw new NotFoundException('Equipamento não encontrado.');
    return item;
  }

  async create(dto: CreateEquipmentDto) {
    await this.assertPlant(dto.plantId);
    await this.assertInverter(dto.plantId, dto.inverterId, dto.type);
    await this.assertSerial(dto.plantId, dto.serialNumber);
    return this.prisma.equipment.create({
      data: {
        plantId: dto.plantId,
        inverterId: dto.type === 'INVERSOR' ? dto.inverterId || null : null,
        type: dto.type,
        manufacturerName: dto.manufacturerName?.trim() || null,
        model: dto.model?.trim() || null,
        serialNumber: dto.serialNumber.trim(),
        notes: dto.notes?.trim() || null,
        status: dto.status ?? 'ACTIVE',
      },
      include,
    });
  }

  async update(id: string, dto: UpdateEquipmentDto) {
    const current = await this.findOne(id);
    const plantId = dto.plantId ?? current.plantId;
    const type = dto.type ?? current.type;
    if (dto.plantId) await this.assertPlant(dto.plantId);
    await this.assertInverter(plantId, dto.inverterId ?? current.inverterId, type);
    if (dto.serialNumber || dto.plantId) {
      await this.assertSerial(plantId, dto.serialNumber ?? current.serialNumber, id);
    }
    return this.prisma.equipment.update({
      where: { id },
      data: {
        ...(dto.plantId ? { plantId: dto.plantId } : {}),
        ...(dto.type ? { type: dto.type } : {}),
        inverterId: type === 'INVERSOR' ? (dto.inverterId ?? current.inverterId) : null,
        ...(dto.manufacturerName !== undefined ? { manufacturerName: dto.manufacturerName?.trim() || null } : {}),
        ...(dto.model !== undefined ? { model: dto.model?.trim() || null } : {}),
        ...(dto.serialNumber ? { serialNumber: dto.serialNumber.trim() } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
      },
      include,
    });
  }

  async updateStatus(id: string, dto: StatusDto) {
    await this.findOne(id);
    return this.prisma.equipment.update({ where: { id }, data: { status: dto.status }, include });
  }

  private async assertPlant(plantId: string) {
    const plant = await this.prisma.plant.findUnique({ where: { id: plantId } });
    if (!plant) throw new NotFoundException('Usina não encontrada.');
  }

  private async assertInverter(plantId: string, inverterId: string | null | undefined, type: string) {
    if (type !== 'INVERSOR' || !inverterId) return;
    const inverter = await this.prisma.inverter.findUnique({ where: { id: inverterId } });
    if (!inverter) throw new NotFoundException('Inversor não encontrado.');
    if (inverter.plantId !== plantId) {
      throw new BadRequestException('O inversor informado não pertence à usina selecionada.');
    }
  }

  private async assertSerial(plantId: string, serialNumber: string, ignoreId?: string) {
    const existing = await this.prisma.equipment.findFirst({
      where: { plantId, serialNumber: serialNumber.trim(), ...(ignoreId ? { NOT: { id: ignoreId } } : {}) },
    });
    if (existing) throw new ConflictException('Já existe um equipamento com este número de série nesta usina.');
  }
}
