import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChallengesService {
  constructor(private prisma: PrismaService) {}

  async getCurrent() {
    const now = new Date();
    return this.prisma.challenge.findMany({
      where: { startsAt: { lte: now }, endsAt: { gte: now } },
      orderBy: { goalKm: 'asc' },
    });
  }

  async join(userId: string, challengeId: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
    });
    if (!challenge) throw new NotFoundException('Desafio não encontrado');

    return this.prisma.userChallenge.upsert({
      where: { userId_challengeId: { userId, challengeId } },
      update: {},
      create: { userId, challengeId, medalStatus: 'PROGRESS' },
    });
  }
}
