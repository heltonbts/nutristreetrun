import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function initials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

@Injectable()
export class RankingService {
  constructor(private prisma: PrismaService) {}

  async getRanking(userId: string, scope: 'city' | 'state' | 'club') {
    const now = new Date();
    const challenge = await this.prisma.challenge.findFirst({
      where: { startsAt: { lte: now }, endsAt: { gte: now } },
    });
    if (!challenge) throw new NotFoundException('Nenhum desafio ativo');

    const me = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (scope === 'club')
      return this.getClubRanking(userId, me.assessoria, challenge);
    return this.getUserRanking(userId, me, challenge, scope);
  }

  private async getUserRanking(
    userId: string,
    me: { city: string | null; state: string | null },
    challenge: { startsAt: Date; endsAt: Date },
    scope: 'city' | 'state',
  ) {
    const filterValue = scope === 'city' ? me.city : me.state;
    const label = filterValue ?? null;

    if (!filterValue) {
      return {
        scope,
        label: null,
        myPos: null,
        items: [],
        hint: 'Adicione sua cidade no perfil para ver o ranking',
      };
    }

    const col = scope === 'city' ? Prisma.raw('"city"') : Prisma.raw('"state"');

    const rows = await this.prisma.$queryRaw<
      {
        userId: string;
        name: string;
        assessoria: string | null;
        city: string | null;
        state: string | null;
        doneKm: number;
      }[]
    >`
      SELECT u.id AS "userId", u.name, u.assessoria, u.city, u.state,
             COALESCE(SUM(CASE WHEN a.counts THEN a."distanceKm" ELSE 0 END), 0)::float AS "doneKm"
      FROM "User" u
      LEFT JOIN "Activity" a ON a."userId" = u.id
        AND a."startedAt" >= ${challenge.startsAt}
        AND a."startedAt" <= ${challenge.endsAt}
      WHERE u.${col} = ${filterValue}
      GROUP BY u.id, u.name, u.assessoria, u.city, u.state
      ORDER BY "doneKm" DESC
    `;

    const items = rows.map((r, i) => ({
      pos: i + 1,
      name: r.name,
      initials: initials(r.name),
      assessoria: r.assessoria,
      city: r.city,
      km: Math.round(r.doneKm * 10) / 10,
      isMe: r.userId === userId,
    }));

    const myPos = items.find((r) => r.isMe)?.pos ?? null;
    return { scope, label, myPos, items };
  }

  private async getClubRanking(
    userId: string,
    myAssessoria: string | null,
    challenge: { startsAt: Date; endsAt: Date },
  ) {
    const rows = await this.prisma.$queryRaw<
      {
        assessoria: string;
        city: string | null;
        runners: number;
        doneKm: number;
      }[]
    >`
      SELECT u.assessoria, u.city,
             COUNT(DISTINCT u.id)::int AS runners,
             COALESCE(SUM(CASE WHEN a.counts THEN a."distanceKm" ELSE 0 END), 0)::float AS "doneKm"
      FROM "User" u
      LEFT JOIN "Activity" a ON a."userId" = u.id
        AND a."startedAt" >= ${challenge.startsAt}
        AND a."startedAt" <= ${challenge.endsAt}
      WHERE u.assessoria IS NOT NULL AND u.assessoria <> ''
      GROUP BY u.assessoria, u.city
      ORDER BY "doneKm" DESC
    `;

    const items = rows.map((r, i) => ({
      pos: i + 1,
      name: r.assessoria,
      city: r.city,
      runners: Number(r.runners),
      km: Math.round(r.doneKm * 10) / 10,
      isMe: r.assessoria === myAssessoria,
    }));

    const myPos = items.find((r) => r.isMe)?.pos ?? null;
    return { scope: 'club' as const, label: 'Assessorias', myPos, items };
  }
}
