import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HomeService {
  constructor(private prisma: PrismaService) {}

  async getHome(userId: string) {
    const now = new Date();

    const [user, challenge] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.prisma.challenge.findFirst({
        where: { startsAt: { lte: now }, endsAt: { gte: now } },
      }),
    ]);

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (!challenge) {
      return this.emptyHome(userId, user.name, thirtyDaysAgo);
    }

    const userChallenge = await this.prisma.userChallenge.findUnique({
      where: { userId_challengeId: { userId, challengeId: challenge.id } },
    });

    if (!userChallenge) {
      return this.emptyHome(userId, user.name, thirtyDaysAgo);
    }

    const activities = await this.prisma.activity.findMany({
      where: {
        userId,
        startedAt: { gte: challenge.startsAt, lte: challenge.endsAt },
      },
      orderBy: { startedAt: 'desc' },
    });

    const doneKm = activities
      .filter((a) => a.counts)
      .reduce((sum, a) => sum + a.distanceKm, 0);

    const pct = Math.min(100, (doneKm / challenge.goalKm) * 100);
    const daysLeft = Math.max(
      0,
      Math.ceil(
        (challenge.endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );

    const ranking = await this.getRanking(userId, challenge.id);

    return {
      userName: user.name,
      challenge: {
        id: challenge.id,
        title: challenge.title,
        goalKm: challenge.goalKm,
        doneKm: Math.round(doneKm * 10) / 10,
        pct: Math.round(pct),
        daysLeft,
      },
      ranking,
      recentActivities: activities
        .slice(0, 5)
        .map((a) => HomeService.mapActivity(a)),
    };
  }

  private async emptyHome(userId: string, userName: string, since: Date) {
    const recent = await this.prisma.activity.findMany({
      where: { userId, startedAt: { gte: since } },
      orderBy: { startedAt: 'desc' },
      take: 5,
    });
    return {
      userName,
      challenge: null,
      ranking: null,
      recentActivities: recent.map((a) => HomeService.mapActivity(a)),
    };
  }

  private static mapActivity(a: {
    id: string;
    title: string;
    distanceKm: number;
    pace: string | null;
    source: string;
    counts: boolean;
    skipReason: string | null;
    startedAt: Date;
  }) {
    return {
      id: a.id,
      title: a.title,
      distanceKm: a.distanceKm,
      pace: a.pace,
      source: a.source,
      counts: a.counts,
      skipReason: a.skipReason,
      startedAt: a.startedAt,
    };
  }

  private async getRanking(userId: string, challengeId: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
    });
    if (!challenge) return null;

    const allProgress = await this.prisma.$queryRaw<
      { userId: string; doneKm: number }[]
    >`
      SELECT a."userId", COALESCE(SUM(a."distanceKm"), 0)::float AS "doneKm"
      FROM "Activity" a
      WHERE a."startedAt" >= ${challenge.startsAt}
        AND a."startedAt" <= ${challenge.endsAt}
        AND a.counts = true
      GROUP BY a."userId"
      ORDER BY "doneKm" DESC
    `;

    const pos = allProgress.findIndex((r) => r.userId === userId) + 1;
    const myKm = allProgress.find((r) => r.userId === userId)?.doneKm ?? 0;
    const aheadKm =
      pos > 1 ? Math.round((allProgress[pos - 2].doneKm - myKm) * 10) / 10 : 0;

    return {
      pos: pos || allProgress.length + 1,
      aheadKm,
      total: allProgress.length,
    };
  }
}
