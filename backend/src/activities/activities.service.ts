import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { StravaDetailActivity, StravaService } from '../strava/strava.service';

@Injectable()
export class ActivitiesService {
  constructor(
    private prisma: PrismaService,
    private stravaService: StravaService,
  ) {}

  async getChartData(userId: string, months: number) {
    const LABELS = [
      'jan',
      'fev',
      'mar',
      'abr',
      'mai',
      'jun',
      'jul',
      'ago',
      'set',
      'out',
      'nov',
      'dez',
    ];
    const now = new Date();
    const result: {
      year: number;
      month: number;
      label: string;
      totalKm: number;
      runCount: number;
      activeDays: number;
      avgPaceSec: number | null;
    }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const from = new Date(year, month - 1, 1);
      const to = new Date(year, month, 0, 23, 59, 59);

      const acts = await this.prisma.activity.findMany({
        where: { userId, counts: true, startedAt: { gte: from, lte: to } },
      });

      const totalKm =
        Math.round(acts.reduce((s, a) => s + a.distanceKm, 0) * 10) / 10;
      const runCount = acts.length;
      const activeDays = new Set(acts.map((a) => a.startedAt.toDateString()))
        .size;

      const paceSeconds = acts
        .map((a) => {
          const m = a.pace?.match(/^(\d+)'(\d+)/);
          return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : null;
        })
        .filter((s): s is number => s !== null);

      const avgPaceSec =
        paceSeconds.length > 0
          ? Math.round(
              paceSeconds.reduce((a, b) => a + b, 0) / paceSeconds.length,
            )
          : null;

      result.push({
        year,
        month,
        label: LABELS[month - 1],
        totalKm,
        runCount,
        activeDays,
        avgPaceSec,
      });
    }

    return result;
  }

  async getSummary(userId: string, year: number, month: number) {
    const getActs = (y: number, m: number) => {
      const from = new Date(y, m - 1, 1);
      const to = new Date(y, m, 0, 23, 59, 59);
      return this.prisma.activity.findMany({
        where: { userId, counts: true, startedAt: { gte: from, lte: to } },
      });
    };

    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;

    const [curr, prev] = await Promise.all([
      getActs(year, month),
      getActs(prevYear, prevMonth),
    ]);

    const summarize = (acts: Awaited<ReturnType<typeof getActs>>) => {
      const totalKm =
        Math.round(acts.reduce((s, a) => s + a.distanceKm, 0) * 10) / 10;
      const runCount = acts.length;
      const longestKm = acts.length
        ? Math.max(...acts.map((a) => a.distanceKm))
        : 0;
      const activeDays = new Set(acts.map((a) => a.startedAt.toDateString()))
        .size;

      const paceSeconds = acts
        .map((a) => {
          const m = a.pace?.match(/^(\d+)'(\d+)/);
          return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : null;
        })
        .filter((s): s is number => s !== null);

      const avgPaceSec =
        paceSeconds.length > 0
          ? Math.round(
              paceSeconds.reduce((a, b) => a + b, 0) / paceSeconds.length,
            )
          : null;

      return { totalKm, runCount, longestKm, activeDays, avgPaceSec };
    };

    const c = summarize(curr);
    const p = summarize(prev);

    const pct = (a: number | null, b: number | null, lowerBetter = false) => {
      if (a == null || b == null || b === 0) return null;
      const delta = Math.round(((a - b) / b) * 100);
      return lowerBetter ? -delta : delta;
    };

    const fmtPace = (sec: number | null) => {
      if (!sec) return null;
      return `${Math.floor(sec / 60)}'${String(sec % 60).padStart(2, '0')}"`;
    };

    return {
      current: { year, month, ...c, avgPaceFmt: fmtPace(c.avgPaceSec) },
      previous: {
        year: prevYear,
        month: prevMonth,
        ...p,
        avgPaceFmt: fmtPace(p.avgPaceSec),
      },
      delta: {
        totalKm: pct(c.totalKm, p.totalKm),
        runCount: pct(c.runCount, p.runCount),
        longestKm: pct(c.longestKm, p.longestKm),
        activeDays: pct(c.activeDays, p.activeDays),
        avgPaceSec: pct(c.avgPaceSec, p.avgPaceSec, true),
      },
    };
  }

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
    const activity = await this.prisma.activity.findFirstOrThrow({
      where: { id, userId },
    });

    const now = new Date();
    const challenge = await this.prisma.challenge.findFirst({
      where: { startsAt: { lte: now }, endsAt: { gte: now } },
    });

    let challengeData: {
      title: string;
      goalKm: number;
      doneKm: number;
      daysLeft: number;
      kmPerDayNeeded: number;
      pct: number;
    } | null = null;

    if (challenge) {
      const agg = await this.prisma.activity.aggregate({
        where: {
          userId,
          counts: true,
          startedAt: { gte: challenge.startsAt, lte: challenge.endsAt },
        },
        _sum: { distanceKm: true },
      });
      const doneKm = agg._sum.distanceKm ?? 0;
      const daysLeft = Math.max(
        0,
        Math.ceil((challenge.endsAt.getTime() - now.getTime()) / 86400000),
      );
      const remaining = Math.max(0, challenge.goalKm - doneKm);
      const kmPerDayNeeded = daysLeft > 0 ? remaining / daysLeft : 0;
      const pct = challenge.goalKm > 0 ? (doneKm / challenge.goalKm) * 100 : 0;

      challengeData = {
        title: challenge.title,
        goalKm: challenge.goalKm,
        doneKm: Math.round(doneKm * 10) / 10,
        daysLeft,
        kmPerDayNeeded: Math.round(kmPerDayNeeded * 10) / 10,
        pct: Math.round(pct),
      };
    }

    let stravaDetail: StravaDetailActivity | null = null;
    if (activity.stravaId) {
      try {
        stravaDetail = await this.stravaService.getActivityDetail(
          userId,
          activity.stravaId,
        );
      } catch {
        // Strava not connected or API error — return local data only
      }
    }

    return {
      ...activity,
      strava: stravaDetail,
      challenge: challengeData,
    };
  }
}
