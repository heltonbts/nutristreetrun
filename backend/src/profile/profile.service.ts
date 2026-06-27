import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

import { PrismaService } from '../prisma/prisma.service';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const now = new Date();

    const [user, challenge] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
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

    const [userChallenges, allActivities] = await Promise.all([
      this.prisma.userChallenge.findMany({
        where: { userId },
        include: { challenge: true },
        orderBy: { challenge: { startsAt: 'desc' } },
      }),
      this.prisma.activity.findMany({
        where: { userId, counts: true },
        select: { distanceKm: true, startedAt: true },
      }),
    ]);

    const streak = this.computeStreak(
      allActivities.map((a) => a.startedAt),
      now,
    );

    const medals = userChallenges.map((uc) => ({
      id: uc.id,
      year: uc.challenge.year,
      month: uc.challenge.month,
      title: uc.challenge.title,
      goalKm: uc.challenge.goalKm,
      status: uc.medalStatus,
    }));

    const totalMedals = userChallenges.filter((uc) =>
      ['SHIPPED', 'DELIVERED'].includes(uc.medalStatus),
    ).length;
    const totalKm =
      Math.round(allActivities.reduce((s, a) => s + a.distanceKm, 0) * 10) / 10;
    const monthsActive = userChallenges.length;

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        state: user.state,
        assessoria: user.assessoria,
        bio: user.bio,
        featuredMedalIds: user.featuredMedalIds,
        avatarUrl: user.avatarUrl,
        weightKg: user.weightKg,
        heightCm: user.heightCm,
      },
      address: {
        zipCode: user.zipCode,
        street: user.street,
        streetNumber: user.streetNumber,
        complement: user.complement,
        neighborhood: user.neighborhood,
        deliveryCity: user.deliveryCity,
        deliveryState: user.deliveryState,
      },
      challenge: challengeData,
      medals,
      stats: { totalMedals, totalKm, monthsActive },
      streak,
    };
  }

  // ── Streak semanal (estilo Strava) ───────────────────────────────────────
  // Sequência = nº de semanas consecutivas (seg–dom) com ≥1 atividade.
  // A semana atual entra com "graça": se ainda não correu nela, conta a partir
  // da semana passada (você tem até domingo pra manter a sequência).
  private static readonly WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  // America/Sao_Paulo é UTC-3 fixo (sem horário de verão desde 2019).
  private static readonly BR_OFFSET_MS = -3 * 60 * 60 * 1000;

  /** Segunda-feira 00:00 (horário BR) da semana que contém `d`, como chave ms. */
  private weekKey(d: Date): number {
    const b = new Date(d.getTime() + ProfileService.BR_OFFSET_MS);
    const daysFromMonday = (b.getUTCDay() + 6) % 7; // seg→0 … dom→6
    return Date.UTC(
      b.getUTCFullYear(),
      b.getUTCMonth(),
      b.getUTCDate() - daysFromMonday,
    );
  }

  private computeStreak(dates: Date[], now: Date) {
    const b = new Date(now.getTime() + ProfileService.BR_OFFSET_MS);
    const curYear = b.getUTCFullYear();
    const curMonth = b.getUTCMonth(); // 0-based

    const weekSet = new Set(dates.map((d) => this.weekKey(d)));

    // Conta semanas consecutivas a partir da atual (com graça pra semana atual).
    let cursor = this.weekKey(now);
    if (!weekSet.has(cursor)) cursor -= ProfileService.WEEK_MS;
    const streakWeeks = new Set<number>();
    while (weekSet.has(cursor)) {
      streakWeeks.add(cursor);
      cursor -= ProfileService.WEEK_MS;
    }

    const activities = dates.filter((d) =>
      streakWeeks.has(this.weekKey(d)),
    ).length;

    // Dias do mês atual (BR) com ≥1 atividade — pro calendário do perfil.
    const monthActiveDays = [
      ...new Set(
        dates
          .map((d) => new Date(d.getTime() + ProfileService.BR_OFFSET_MS))
          .filter(
            (d) =>
              d.getUTCFullYear() === curYear && d.getUTCMonth() === curMonth,
          )
          .map((d) => d.getUTCDate()),
      ),
    ].sort((x, y) => x - y);

    return {
      weeks: streakWeeks.size,
      activities,
      year: curYear,
      month: curMonth + 1, // 1-based pro client
      monthActiveDays,
    };
  }

  async updateProfile(
    userId: string,
    dto: {
      name?: string;
      phone?: string;
      city?: string;
      state?: string;
      assessoria?: string;
      bio?: string;
      featuredMedalIds?: string[];
      weightKg?: number;
      heightCm?: number;
    },
  ) {
    // Se o cliente mandou destaques, garante que são medalhas que o usuário
    // realmente possui (ignora ids inválidos / de outras pessoas).
    let featuredMedalIds: string[] | undefined;
    if (dto.featuredMedalIds !== undefined) {
      const owned = await this.prisma.userChallenge.findMany({
        where: { userId, id: { in: dto.featuredMedalIds } },
        select: { id: true },
      });
      const ownedSet = new Set(owned.map((uc) => uc.id));
      featuredMedalIds = dto.featuredMedalIds.filter((id) => ownedSet.has(id));
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.assessoria !== undefined && { assessoria: dto.assessoria }),
        ...(dto.bio !== undefined && { bio: dto.bio || null }),
        ...(featuredMedalIds !== undefined && { featuredMedalIds }),
        ...(dto.weightKg !== undefined && { weightKg: dto.weightKg }),
        ...(dto.heightCm !== undefined && { heightCm: dto.heightCm }),
      },
    });
    return {
      name: user.name,
      phone: user.phone,
      city: user.city,
      state: user.state,
      assessoria: user.assessoria,
      bio: user.bio,
      featuredMedalIds: user.featuredMedalIds,
      weightKg: user.weightKg,
      heightCm: user.heightCm,
    };
  }

  async updateAddress(
    userId: string,
    dto: {
      zipCode: string;
      street: string;
      streetNumber: string;
      complement?: string;
      neighborhood: string;
      deliveryCity: string;
      deliveryState: string;
    },
  ) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        zipCode: dto.zipCode,
        street: dto.street,
        streetNumber: dto.streetNumber,
        complement: dto.complement ?? null,
        neighborhood: dto.neighborhood,
        deliveryCity: dto.deliveryCity,
        deliveryState: dto.deliveryState,
      },
    });
    return { ok: true };
  }

  async updatePushToken(userId: string, token: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { pushToken: token },
    });
    return { ok: true };
  }

  async uploadAvatar(
    userId: string,
    buffer: Buffer,
  ): Promise<{ avatarUrl: string }> {
    const result = await new Promise<{ secure_url: string }>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: 'nsr/avatars',
              public_id: `user_${userId}`,
              overwrite: true,
              transformation: [
                { width: 256, height: 256, crop: 'fill', gravity: 'face' },
              ],
            },
            (err, res) => {
              if (err || !res)
                return reject(
                  new Error(err?.message ?? 'Cloudinary upload failed'),
                );
              resolve(res);
            },
          )
          .end(buffer);
      },
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: result.secure_url },
    });

    return { avatarUrl: result.secure_url };
  }
}
