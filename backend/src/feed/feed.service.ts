import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

const FEED_LIMIT = 20;
const FEED_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ITEMS_PER_USER = 3;
const TIME_DECAY_HALF_LIFE_H = 6;
const PROXIMITY_ASSESSORIA = 1.5;
const PROXIMITY_CITY = 1.2;
// Boost pra quem o usuário segue: o feed prioriza seguidos, mas ainda mistura
// descobertas da comunidade quando falta conteúdo de quem você segue.
const FOLLOWING_BOOST = 3;
// Top comments mostrados na prévia do card (estilo Instagram).
const TOP_COMMENTS_PER_ITEM = 2;

type TopComment = {
  id: string;
  body: string;
  user: { id: string; name: string; avatarUrl: string | null };
};

type FeedAuthor = {
  id: string;
  name: string;
  avatarUrl: string | null;
  assessoria: string | null;
};

interface ActivityItem {
  type: 'activity';
  score: number;
  authorId: string;
  data: {
    id: string;
    user: FeedAuthor;
    title: string;
    distanceKm: number;
    pace: string | null;
    durationSec: number | null;
    routePolyline: string | null;
    startedAt: Date;
    likesCount: number;
    likedByMe: boolean;
    commentsCount: number;
    topComments: TopComment[];
  };
}

interface PostItem {
  type: 'post';
  score: number;
  authorId: string;
  data: {
    id: string;
    user: FeedAuthor;
    body: string;
    imageUrl: string | null;
    createdAt: Date;
    likesCount: number;
    likedByMe: boolean;
    commentsCount: number;
    topComments: TopComment[];
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

    // Quem o usuário segue (+ ele mesmo) → fonte primária do feed.
    const follows = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingSet = new Set(follows.map((f) => f.followingId));
    const primaryIds = new Set<string>([userId, ...followingSet]);

    // Fonte de descoberta (comunidade): mesma assessoria/cidade, pra completar
    // o feed quando você segue pouca gente.
    const orConditions: { assessoria?: string; city?: string }[] = [];
    if (currentUser.assessoria)
      orConditions.push({ assessoria: currentUser.assessoria });
    if (currentUser.city) orConditions.push({ city: currentUser.city });

    const communityIds = new Set<string>();
    if (orConditions.length > 0) {
      const peers = await this.prisma.user.findMany({
        where: { id: { not: userId }, OR: orConditions },
        select: { id: true },
        take: 500,
      });
      for (const p of peers) if (!primaryIds.has(p.id)) communityIds.add(p.id);
    }

    const candidateIds = [...primaryIds, ...communityIds];

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
          userId: { in: candidateIds },
          startedAt: { gte: since },
          counts: true,
        },
        include: { user: { select: userSelect } },
        orderBy: { startedAt: 'desc' },
        take: 300,
      }),
      this.prisma.post.findMany({
        where: { userId: { in: candidateIds }, createdAt: { gte: since } },
        include: { user: { select: userSelect } },
        orderBy: { createdAt: 'desc' },
        take: 300,
      }),
    ]);

    const activityIds = activities.map((a) => a.id);
    const postIds = posts.map((p) => p.id);

    // Likes = qualquer reação (curtida única). Conta por alvo + se eu curti.
    const [actLikeMap, postLikeMap, actCmtMap, postCmtMap, myLikes] =
      await Promise.all([
        this.countByTarget('activity', activityIds, 'reaction'),
        this.countByTarget('post', postIds, 'reaction'),
        this.countByTarget('activity', activityIds, 'comment'),
        this.countByTarget('post', postIds, 'comment'),
        activityIds.length + postIds.length
          ? this.prisma.reaction.findMany({
              where: {
                userId,
                OR: [
                  { targetType: 'activity', targetId: { in: activityIds } },
                  { targetType: 'post', targetId: { in: postIds } },
                ],
              },
              select: { targetId: true },
            })
          : Promise.resolve([]),
      ]);

    const myLikeSet = new Set(myLikes.map((r) => r.targetId));

    const computeScore = (
      createdAt: Date,
      authorId: string,
      itemUser: { assessoria?: string | null; city?: string | null },
      totalLikes: number,
      totalComments: number,
    ) => {
      const follow = followingSet.has(authorId) ? FOLLOWING_BOOST : 1;
      const proximity =
        currentUser.assessoria && itemUser.assessoria === currentUser.assessoria
          ? PROXIMITY_ASSESSORIA
          : currentUser.city && itemUser.city === currentUser.city
            ? PROXIMITY_CITY
            : 1.0;
      const hoursAgo = (Date.now() - createdAt.getTime()) / 3_600_000;
      const timeDecay = 1 / Math.pow(1 + hoursAgo / TIME_DECAY_HALF_LIFE_H, 1.5);
      const engagement = 1 + totalLikes * 0.2 + totalComments * 0.3;
      return follow * proximity * timeDecay * engagement;
    };

    const items: FeedItem[] = [];

    for (const a of activities) {
      const likesCount = actLikeMap.get(a.id) ?? 0;
      const commentsCount = actCmtMap.get(a.id) ?? 0;
      items.push({
        type: 'activity',
        authorId: a.userId,
        score: computeScore(
          a.startedAt,
          a.userId,
          a.user,
          likesCount,
          commentsCount,
        ),
        data: {
          id: a.id,
          user: this.author(a.user),
          title: a.title,
          distanceKm: a.distanceKm,
          pace: a.pace,
          durationSec: a.durationSec,
          routePolyline: a.routePolyline,
          startedAt: a.startedAt,
          likesCount,
          likedByMe: myLikeSet.has(a.id),
          commentsCount,
          topComments: [],
        },
      });
    }

    for (const p of posts) {
      const likesCount = postLikeMap.get(p.id) ?? 0;
      const commentsCount = postCmtMap.get(p.id) ?? 0;
      items.push({
        type: 'post',
        authorId: p.userId,
        score: computeScore(
          p.createdAt,
          p.userId,
          p.user,
          likesCount,
          commentsCount,
        ),
        data: {
          id: p.id,
          user: this.author(p.user),
          body: p.body,
          imageUrl: p.imageUrl,
          createdAt: p.createdAt,
          likesCount,
          likedByMe: myLikeSet.has(p.id),
          commentsCount,
          topComments: [],
        },
      });
    }

    items.sort((a, b) => b.score - a.score);

    // Cap: no máximo MAX_ITEMS_PER_USER por autor pra não inundar o feed.
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

    // Top comments só para a página atual (com body + autor): mais pesado, então
    // limitamos aos ~20 itens visíveis em vez de todos os candidatos.
    await this.attachTopComments(paginated);

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

  private author(u: {
    id: string;
    name: string;
    avatarUrl: string | null;
    assessoria: string | null;
  }): FeedAuthor {
    return {
      id: u.id,
      name: u.name,
      avatarUrl: u.avatarUrl,
      assessoria: u.assessoria,
    };
  }

  /** Conta linhas (reações ou comentários) por targetId → Map. */
  private async countByTarget(
    targetType: string,
    targetIds: string[],
    model: 'reaction' | 'comment',
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (targetIds.length === 0) return map;

    const groups =
      model === 'reaction'
        ? await this.prisma.reaction.groupBy({
            by: ['targetId'],
            where: { targetType, targetId: { in: targetIds } },
            _count: { id: true },
          })
        : await this.prisma.comment.groupBy({
            by: ['targetId'],
            where: { targetType, targetId: { in: targetIds } },
            _count: { id: true },
          });

    for (const g of groups) map.set(g.targetId, g._count.id);
    return map;
  }

  /** Anexa os comentários mais recentes a cada item da página (in-place). */
  private async attachTopComments(items: FeedItem[]) {
    const byTarget = new Map<string, FeedItem>();
    for (const it of items) byTarget.set(it.data.id, it);
    if (byTarget.size === 0) return;

    const activityIds = items
      .filter((i) => i.type === 'activity')
      .map((i) => i.data.id);
    const postIds = items.filter((i) => i.type === 'post').map((i) => i.data.id);

    const comments = await this.prisma.comment.findMany({
      where: {
        OR: [
          { targetType: 'activity', targetId: { in: activityIds } },
          { targetType: 'post', targetId: { in: postIds } },
        ],
      },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const grouped = new Map<string, TopComment[]>();
    for (const c of comments) {
      const arr = grouped.get(c.targetId) ?? [];
      if (arr.length < TOP_COMMENTS_PER_ITEM) {
        arr.push({
          id: c.id,
          body: c.body,
          user: {
            id: c.user.id,
            name: c.user.name,
            avatarUrl: c.user.avatarUrl,
          },
        });
        grouped.set(c.targetId, arr);
      }
    }

    // Os mais recentes vêm primeiro do banco; invertemos pra exibir em ordem
    // cronológica (igual Instagram: comentário mais antigo no topo da prévia).
    for (const [targetId, arr] of grouped) {
      const item = byTarget.get(targetId);
      if (item) item.data.topComments = arr.reverse();
    }
  }
}
