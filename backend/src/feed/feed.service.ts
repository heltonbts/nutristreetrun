import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

const FEED_LIMIT = 20;
const FEED_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ITEMS_PER_USER = 3;
const TIME_DECAY_HALF_LIFE_H = 6;
const PROXIMITY_ASSESSORIA = 1.5;
const PROXIMITY_CITY = 1.2;

type ReactionSummary = { type: string; count: number; myReaction: boolean };

interface ActivityItem {
  type: 'activity';
  score: number;
  authorId: string;
  data: {
    id: string;
    user: {
      id: string;
      name: string;
      avatarUrl: string | null;
      assessoria: string | null;
    };
    title: string;
    distanceKm: number;
    pace: string | null;
    startedAt: Date;
    reactions: ReactionSummary[];
    commentsCount: number;
  };
}

interface PostItem {
  type: 'post';
  score: number;
  authorId: string;
  data: {
    id: string;
    user: {
      id: string;
      name: string;
      avatarUrl: string | null;
      assessoria: string | null;
    };
    body: string;
    imageUrl: string | null;
    createdAt: Date;
    reactions: ReactionSummary[];
    commentsCount: number;
  };
}

type FeedItem = ActivityItem | PostItem;

@Injectable()
export class FeedService {
  constructor(private prisma: PrismaService) {}

  async getFeed(userId: string, page: number) {
    const currentUser = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, assessoria: true, city: true },
    });

    const orConditions: { assessoria?: string; city?: string }[] = [];
    if (currentUser.assessoria)
      orConditions.push({ assessoria: currentUser.assessoria });
    if (currentUser.city) orConditions.push({ city: currentUser.city });

    const communityUserIds: string[] = [userId];
    if (orConditions.length > 0) {
      const peers = await this.prisma.user.findMany({
        where: { id: { not: userId }, OR: orConditions },
        select: { id: true },
        take: 500,
      });
      communityUserIds.push(...peers.map((u) => u.id));
    }

    const since = new Date(Date.now() - FEED_WINDOW_MS);
    const userSelect = {
      id: true,
      name: true,
      avatarUrl: true,
      assessoria: true,
      city: true,
    };

    const [activities, posts] = await Promise.all([
      this.prisma.activity.findMany({
        where: {
          userId: { in: communityUserIds },
          startedAt: { gte: since },
          counts: true,
        },
        include: { user: { select: userSelect } },
        orderBy: { startedAt: 'desc' },
        take: 200,
      }),
      this.prisma.post.findMany({
        where: { userId: { in: communityUserIds }, createdAt: { gte: since } },
        include: { user: { select: userSelect } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);

    const activityIds = activities.map((a) => a.id);
    const postIds = posts.map((p) => p.id);

    const [
      actRxGroups,
      postRxGroups,
      actCmtGroups,
      postCmtGroups,
      myActRx,
      myPostRx,
    ] = await Promise.all([
      activityIds.length
        ? this.prisma.reaction.groupBy({
            by: ['targetId', 'type'],
            where: { targetType: 'activity', targetId: { in: activityIds } },
            _count: { id: true },
          })
        : Promise.resolve([]),
      postIds.length
        ? this.prisma.reaction.groupBy({
            by: ['targetId', 'type'],
            where: { targetType: 'post', targetId: { in: postIds } },
            _count: { id: true },
          })
        : Promise.resolve([]),
      activityIds.length
        ? this.prisma.comment.groupBy({
            by: ['targetId'],
            where: { targetType: 'activity', targetId: { in: activityIds } },
            _count: { id: true },
          })
        : Promise.resolve([]),
      postIds.length
        ? this.prisma.comment.groupBy({
            by: ['targetId'],
            where: { targetType: 'post', targetId: { in: postIds } },
            _count: { id: true },
          })
        : Promise.resolve([]),
      activityIds.length
        ? this.prisma.reaction.findMany({
            where: {
              userId,
              targetType: 'activity',
              targetId: { in: activityIds },
            },
            select: { targetId: true, type: true },
          })
        : Promise.resolve([]),
      postIds.length
        ? this.prisma.reaction.findMany({
            where: { userId, targetType: 'post', targetId: { in: postIds } },
            select: { targetId: true, type: true },
          })
        : Promise.resolve([]),
    ]);

    const buildRxMap = (
      groups: { targetId: string; type: string; _count: { id: number } }[],
    ) => {
      const map = new Map<string, Record<string, number>>();
      for (const g of groups) {
        const curr = map.get(g.targetId) ?? {};
        curr[g.type] = (curr[g.type] ?? 0) + g._count.id;
        map.set(g.targetId, curr);
      }
      return map;
    };

    const buildCmtMap = (
      groups: { targetId: string; _count: { id: number } }[],
    ) => {
      const map = new Map<string, number>();
      for (const g of groups) map.set(g.targetId, g._count.id);
      return map;
    };

    const buildMyRxMap = (reactions: { targetId: string; type: string }[]) => {
      const map = new Map<string, string>();
      for (const r of reactions) map.set(r.targetId, r.type);
      return map;
    };

    const actRxMap = buildRxMap(actRxGroups);
    const postRxMap = buildRxMap(postRxGroups);
    const actCmtMap = buildCmtMap(actCmtGroups);
    const postCmtMap = buildCmtMap(postCmtGroups);
    const myActRxMap = buildMyRxMap(myActRx);
    const myPostRxMap = buildMyRxMap(myPostRx);

    const computeScore = (
      createdAt: Date,
      itemUser: { assessoria?: string | null; city?: string | null },
      totalReactions: number,
      totalComments: number,
    ) => {
      const proximity =
        currentUser.assessoria && itemUser.assessoria === currentUser.assessoria
          ? PROXIMITY_ASSESSORIA
          : currentUser.city && itemUser.city === currentUser.city
            ? PROXIMITY_CITY
            : 1.0;
      const hoursAgo = (Date.now() - createdAt.getTime()) / 3_600_000;
      const timeDecay =
        1 / Math.pow(1 + hoursAgo / TIME_DECAY_HALF_LIFE_H, 1.5);
      const engagement = 1 + totalReactions * 0.2 + totalComments * 0.3;
      return proximity * timeDecay * engagement;
    };

    const buildReactions = (
      rxMap: Map<string, Record<string, number>>,
      myRxMap: Map<string, string>,
      targetId: string,
    ): ReactionSummary[] => {
      const rx = rxMap.get(targetId) ?? {};
      return ['fire', 'clap'].map((type) => ({
        type,
        count: rx[type] ?? 0,
        myReaction: myRxMap.get(targetId) === type,
      }));
    };

    const items: FeedItem[] = [];

    for (const a of activities) {
      const rxMap = actRxMap.get(a.id) ?? {};
      const totalRx = Object.values(rxMap).reduce((s, c) => s + c, 0);
      const totalCmt = actCmtMap.get(a.id) ?? 0;
      items.push({
        type: 'activity',
        authorId: a.userId,
        score: computeScore(a.startedAt, a.user, totalRx, totalCmt),
        data: {
          id: a.id,
          user: {
            id: a.user.id,
            name: a.user.name,
            avatarUrl: a.user.avatarUrl,
            assessoria: a.user.assessoria,
          },
          title: a.title,
          distanceKm: a.distanceKm,
          pace: a.pace,
          startedAt: a.startedAt,
          reactions: buildReactions(actRxMap, myActRxMap, a.id),
          commentsCount: totalCmt,
        },
      });
    }

    for (const p of posts) {
      const rxMap = postRxMap.get(p.id) ?? {};
      const totalRx = Object.values(rxMap).reduce((s, c) => s + c, 0);
      const totalCmt = postCmtMap.get(p.id) ?? 0;
      items.push({
        type: 'post',
        authorId: p.userId,
        score: computeScore(p.createdAt, p.user, totalRx, totalCmt),
        data: {
          id: p.id,
          user: {
            id: p.user.id,
            name: p.user.name,
            avatarUrl: p.user.avatarUrl,
            assessoria: p.user.assessoria,
          },
          body: p.body,
          imageUrl: p.imageUrl,
          createdAt: p.createdAt,
          reactions: buildReactions(postRxMap, myPostRxMap, p.id),
          commentsCount: totalCmt,
        },
      });
    }

    items.sort((a, b) => b.score - a.score);

    // Cap: max MAX_ITEMS_PER_USER items per author to avoid flooding
    const authorCount = new Map<string, number>();
    const capped: FeedItem[] = [];
    for (const item of items) {
      const count = authorCount.get(item.authorId) ?? 0;
      if (count < MAX_ITEMS_PER_USER) {
        capped.push(item);
        authorCount.set(item.authorId, count + 1);
      }
    }

    const offset = (page - 1) * FEED_LIMIT;
    const paginated = capped.slice(offset, offset + FEED_LIMIT);

    return {
      items: paginated.map(({ type, score, data }) => ({
        type,
        score: Math.round(score * 1000) / 1000,
        data,
      })),
      page,
      hasMore: capped.length > offset + FEED_LIMIT,
    };
  }
}
