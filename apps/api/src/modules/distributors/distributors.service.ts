import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateDistributorDto, StatusDto, UpdateDistributorDto } from '../common/dto';

@Injectable()
export class DistributorsService {
  constructor(private prisma: PrismaService) {}

  findAll(filters?: { name?: string; code?: string; status?: string }) {
    const name = filters?.name?.trim();
    const code = filters?.code?.trim();
    return this.prisma.distributor.findMany({
      where: {
        ...(name ? { name: { contains: name, mode: 'insensitive' } } : {}),
        ...(code ? { code: { contains: code, mode: 'insensitive' } } : {}),
        ...(filters?.status ? { status: filters.status as never } : {}),
      },
      include: { _count: { select: { consumerUnits: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.distributor.findUnique({
      where: { id },
      include: {
        consumerUnits: {
          include: { consumer: true },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { consumerUnits: true } },
      },
    });
    if (!item) throw new NotFoundException('Distribuidora não encontrada.');
    return item;
  }

  async create(dto: CreateDistributorDto) {
    await this.assertUniqueCode(dto.code);
    return this.prisma.distributor.create({
      data: {
        name: dto.name.trim(),
        code: dto.code.trim().toUpperCase(),
        cnpj: dto.cnpj?.trim() || null,
        status: dto.status ?? 'ACTIVE',
      },
    });
  }

  async update(id: string, dto: UpdateDistributorDto) {
    await this.findOne(id);
    if (dto.code) await this.assertUniqueCode(dto.code, id);
    return this.prisma.distributor.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.code ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.cnpj !== undefined ? { cnpj: dto.cnpj?.trim() || null } : {}),
      },
    });
  }

  async updateStatus(id: string, dto: StatusDto) {
    await this.findOne(id);
    return this.prisma.distributor.update({ where: { id }, data: { status: dto.status } });
  }

  private async assertUniqueCode(code: string, ignoreId?: string) {
    const existing = await this.prisma.distributor.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (existing && existing.id !== ignoreId) {
      throw new ConflictException('Já existe uma distribuidora com este código.');
    }
  }
}
