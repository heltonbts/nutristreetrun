import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, year?: number, month?: number) {
    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = month ?? now.getMonth() + 1;

    const from = new Date(y, m - 1, 1);
    const to = new Date(y, m, 0, 23, 59, 59);

    return this.prisma.activity.findMany({
      where: { userId, startedAt: { gte: from, lte: to } },
      orderBy: { startedAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    return this.prisma.activity.findFirstOrThrow({
      where: { id, userId },
    });
  }
}
