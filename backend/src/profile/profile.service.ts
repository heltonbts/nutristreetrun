import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const now = new Date();

    const [user, stravaConn, challenge] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.prisma.stravaConnection.findUnique({ where: { userId } }),
      this.prisma.challenge.findFirst({
        where: { startsAt: { lte: now }, endsAt: { gte: now } },
      }),
    ]);

    let challengeData: {
      id: string;
      title: string;
      goalKm: number;
      doneKm: number;
      pct: number;
      daysLeft: number;
    } | null = null;

    if (challenge) {
      const activities = await this.prisma.activity.findMany({
        where: {
          userId,
          startedAt: { gte: challenge.startsAt, lte: challenge.endsAt },
          counts: true,
        },
      });

      const doneKm = activities.reduce((sum, a) => sum + a.distanceKm, 0);
      const pct = Math.min(100, (doneKm / challenge.goalKm) * 100);
      const daysLeft = Math.max(
        0,
        Math.ceil(
          (challenge.endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        ),
      );

      challengeData = {
        id: challenge.id,
        title: challenge.title,
        goalKm: challenge.goalKm,
        doneKm: Math.round(doneKm * 10) / 10,
        pct: Math.round(pct),
        daysLeft,
      };
    }

    const userChallenges = await this.prisma.userChallenge.findMany({
      where: { userId },
      include: { challenge: true },
      orderBy: { challenge: { startsAt: 'desc' } },
    });

    const medals = userChallenges.map((uc) => ({
      id: uc.id,
      year: uc.challenge.year,
      month: uc.challenge.month,
      title: uc.challenge.title,
      goalKm: uc.challenge.goalKm,
      status: uc.medalStatus,
    }));

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        state: user.state,
        assessoria: user.assessoria,
      },
      strava: stravaConn
        ? { connected: true, stravaId: stravaConn.stravaId }
        : { connected: false, stravaId: null },
      challenge: challengeData,
      medals,
    };
  }
}
