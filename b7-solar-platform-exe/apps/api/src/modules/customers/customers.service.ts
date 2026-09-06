import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}
  findAll() { return this.prisma.customer.findMany({ orderBy: { createdAt: 'desc' } }); }
  findOne(id: string) { return this.prisma.customer.findUnique({ where: { id }, include: { plants: true } }); }
}