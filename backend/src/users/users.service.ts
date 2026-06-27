import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

const GRID_PAGE_SIZE = 24;

type PublicUserSelect = {
  id: string;
  name: string;
  avatarUrl: string | null;
  city: string | null;
  state: string | null;
  assessoria: string | null;
};

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ─── Follow ──────────────────────────────────────────────────────────────

  async follow(followerId: string, followingId: string) {
    if (followerId === followingId)
      throw new BadRequestException('Você não pode seguir a si mesmo');

    const follower = await this.prisma.user.findUniqueOrThrow({
      where: { id: followerId },
      select: { name: true },
    });
    await this.prisma.user.findUniqueOrThrow({
      where: { id: followingId },
      select: { id: true },
    });

    // Idempotente: se já segue, não duplica (unique [followerId, followingId]).
    const existing = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
      select: { id: true },
    });
    await this.prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      create: { followerId, followingId },
      update: {},
    });

    // Notifica só em follow novo (evita spam ao re-seguir).
    if (!existing) {
      const name = follower.name?.split(' ')[0] ?? 'Alguém';
      void this.notifications.create({
        userId: followingId,
        type: 'FOLLOW',
        actorId: followerId,
        targetType: 'user',
        targetId: followerId,
        title: 'Novo seguidor',
        body: `${name} começou a te seguir.`,
      });
    }

    return { isFollowing: true, ...(await this.followCounts(followingId)) };
  }

  async unfollow(followerId: string, followingId: string) {
    await this.prisma.follow.deleteMany({
      where: { followerId, followingId },
    });
    return { isFollowing: false, ...(await this.followCounts(followingId)) };
  }

  private async followCounts(userId: string) {
    const [followers, following] = await Promise.all([
      this.prisma.follow.count({ where: { followingId: userId } }),
      this.prisma.follow.count({ where: { followerId: userId } }),
    ]);
    return { followers, following };
  }

  /** IDs que `userId` segue. */
  async followingIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    return rows.map((r) => r.followingId);
  }

  async listFollowers(targetId: string, meId: string) {
    const rows = await this.prisma.follow.findMany({
      where: { followingId: targetId },
      include: { follower: { select: this.publicSelect() } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return this.decorateWithIsFollowing(
      rows.map((r) => r.follower),
      meId,
    );
  }

  async listFollowing(targetId: string, meId: string) {
    const rows = await this.prisma.follow.findMany({
      where: { followerId: targetId },
      include: { following: { select: this.publicSelect() } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return this.decorateWithIsFollowing(
      rows.map((r) => r.following),
      meId,
    );
  }

  private async decorateWithIsFollowing(
    users: PublicUserSelect[],
    meId: string,
  ) {
    if (users.length === 0) return [];
    const myFollows = await this.prisma.follow.findMany({
      where: { followerId: meId, followingId: { in: users.map((u) => u.id) } },
      select: { followingId: true },
    });
    const followingSet = new Set(myFollows.map((f) => f.followingId));
    return users.map((u) => ({
      ...u,
      isFollowing: followingSet.has(u.id),
      isMe: u.id === meId,
    }));
  }

  // ─── Perfil público ──────────────────────────────────────────────────────

  async getPublicProfile(targetId: string, meId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: this.publicSelect(),
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const [
      postsCount,
      activitiesCount,
      followers,
      following,
      isFollowingRow,
      activities,
      userChallenges,
    ] = await Promise.all([
      this.prisma.post.count({ where: { userId: targetId } }),
      this.prisma.activity.count({ where: { userId: targetId, counts: true } }),
      this.prisma.follow.count({ where: { followingId: targetId } }),
      this.prisma.follow.count({ where: { followerId: targetId } }),
      meId === targetId
        ? Promise.resolve(null)
        : this.prisma.follow.findUnique({
            where: {
              followerId_followingId: {
                followerId: meId,
                followingId: targetId,
              },
            },
            select: { id: true },
          }),
      this.prisma.activity.findMany({
        where: { userId: targetId, counts: true },
        select: { distanceKm: true },
      }),
      this.prisma.userChallenge.findMany({
        where: { userId: targetId },
        select: { medalStatus: true },
      }),
    ]);

    const totalKm =
      Math.round(activities.reduce((s, a) => s + a.distanceKm, 0) * 10) / 10;
    const totalMedals = userChallenges.filter((uc) =>
      ['SHIPPED', 'DELIVERED'].includes(uc.medalStatus),
    ).length;

    return {
      user,
      counts: { posts: postsCount + activitiesCount, followers, following },
      isFollowing: !!isFollowingRow,
      isMe: meId === targetId,
      stats: { totalKm, totalMedals },
    };
  }

  /** Grid de publicações (posts + corridas) ordenado por data desc. */
  async getGrid(targetId: string, page: number) {
    const take = GRID_PAGE_SIZE;
    const skip = (Math.max(1, page) - 1) * take;

    // Busca um pouco a mais de cada tipo pra mesclar e paginar de forma justa.
    const fetch = skip + take;
    const [posts, activities] = await Promise.all([
      this.prisma.post.findMany({
        where: { userId: targetId },
        select: { id: true, imageUrl: true, body: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: fetch,
      }),
      this.prisma.activity.findMany({
        where: { userId: targetId, counts: true },
        select: {
          id: true,
          routePolyline: true,
          distanceKm: true,
          title: true,
          startedAt: true,
        },
        orderBy: { startedAt: 'desc' },
        take: fetch,
      }),
    ]);

    const merged = [
      ...posts.map((p) => ({
        type: 'post' as const,
        id: p.id,
        imageUrl: p.imageUrl,
        body: p.body,
        routePolyline: null as string | null,
        distanceKm: null as number | null,
        title: null as string | null,
        date: p.createdAt,
      })),
      ...activities.map((a) => ({
        type: 'activity' as const,
        id: a.id,
        imageUrl: null as string | null,
        body: null as string | null,
        routePolyline: a.routePolyline,
        distanceKm: a.distanceKm,
        title: a.title,
        date: a.startedAt,
      })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    const items = merged.slice(skip, skip + take);
    return { items, page: Math.max(1, page), hasMore: merged.length > skip + take };
  }

  private publicSelect() {
    return {
      id: true,
      name: true,
      avatarUrl: true,
      city: true,
      state: true,
      assessoria: true,
      bio: true,
    };
  }
}
