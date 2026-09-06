import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateCustomerDto, StatusDto, UpdateCustomerDto } from '../common/dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.customer.findMany({
      include: { _count: { select: { plants: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { plants: { include: { _count: { select: { inverters: true, equipment: true } } } } },
    });
    if (!customer) throw new NotFoundException('Cliente não encontrado.');
    return customer;
  }

  async create(dto: CreateCustomerDto) {
    await this.assertUniqueDocument(dto.document);
    return this.prisma.customer.create({
      data: {
        name: dto.name.trim(),
        document: dto.document.trim(),
        email: dto.email?.trim() || null,
        phone: dto.phone?.trim() || null,
        status: dto.status ?? 'ACTIVE',
      },
    });
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);
    if (dto.document) await this.assertUniqueDocument(dto.document, id);
    return this.prisma.customer.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.document ? { document: dto.document.trim() } : {}),
        ...(dto.email !== undefined ? { email: dto.email?.trim() || null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
      },
    });
  }

  async updateStatus(id: string, dto: StatusDto) {
    await this.findOne(id);
    return this.prisma.customer.update({ where: { id }, data: { status: dto.status } });
  }

  private async assertUniqueDocument(document: string, ignoreId?: string) {
    const existing = await this.prisma.customer.findUnique({ where: { document: document.trim() } });
    if (existing && existing.id !== ignoreId) {
      throw new ConflictException('Já existe um cliente com este documento.');
    }
  }
}

export function isPrismaUniqueError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
