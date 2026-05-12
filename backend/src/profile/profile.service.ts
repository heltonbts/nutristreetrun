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

    const [userChallenges, allActivities] = await Promise.all([
      this.prisma.userChallenge.findMany({
        where: { userId },
        include: { challenge: true },
        orderBy: { challenge: { startsAt: 'desc' } },
      }),
      this.prisma.activity.findMany({
        where: { userId, counts: true },
        select: { distanceKm: true },
      }),
    ]);

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
      strava: stravaConn
        ? { connected: true, stravaId: stravaConn.stravaId }
        : { connected: false, stravaId: null },
      challenge: challengeData,
      medals,
      stats: { totalMedals, totalKm, monthsActive },
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
      weightKg?: number;
      heightCm?: number;
    },
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.assessoria !== undefined && { assessoria: dto.assessoria }),
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
