import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateConsumerDto, StatusDto, UpdateConsumerDto } from '../common/dto';

@Injectable()
export class ConsumersService {
  constructor(private prisma: PrismaService) {}

  findAll(filters?: { name?: string; document?: string; status?: string }) {
    const name = filters?.name?.trim();
    const document = filters?.document?.trim();
    return this.prisma.consumer.findMany({
      where: {
        ...(name ? { name: { contains: name, mode: 'insensitive' } } : {}),
        ...(document ? { document: { contains: document } } : {}),
        ...(filters?.status ? { status: filters.status as never } : {}),
      },
      include: { _count: { select: { consumerUnits: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.consumer.findUnique({
      where: { id },
      include: {
        consumerUnits: {
          include: { distributor: true },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { consumerUnits: true } },
      },
    });
    if (!item) throw new NotFoundException('Consumidor não encontrado.');
    return item;
  }

  async create(dto: CreateConsumerDto) {
    await this.assertUniqueDocument(dto.document);
    return this.prisma.consumer.create({
      data: {
        name: dto.name.trim(),
        document: dto.document.trim(),
        documentType: dto.documentType,
        email: dto.email?.trim() || null,
        phone: dto.phone?.trim() || null,
        status: dto.status ?? 'ACTIVE',
      },
    });
  }

  async update(id: string, dto: UpdateConsumerDto) {
    await this.findOne(id);
    if (dto.document) await this.assertUniqueDocument(dto.document, id);
    return this.prisma.consumer.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.document ? { document: dto.document.trim() } : {}),
        ...(dto.documentType ? { documentType: dto.documentType } : {}),
        ...(dto.email !== undefined ? { email: dto.email?.trim() || null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
      },
    });
  }

  async updateStatus(id: string, dto: StatusDto) {
    await this.findOne(id);
    return this.prisma.consumer.update({ where: { id }, data: { status: dto.status } });
  }

  private async assertUniqueDocument(document: string, ignoreId?: string) {
    const existing = await this.prisma.consumer.findUnique({
      where: { document: document.trim() },
    });
    if (existing && existing.id !== ignoreId) {
      throw new ConflictException('Já existe um consumidor com este documento.');
    }
  }
}
