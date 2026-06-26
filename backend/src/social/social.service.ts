import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SocialService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /** Dono (userId) do alvo de uma reação/comentário. */
  private async targetOwnerId(
    targetType: string,
    targetId: string,
  ): Promise<string | null> {
    if (targetType === 'post') {
      const p = await this.prisma.post.findUnique({
        where: { id: targetId },
        select: { userId: true },
      });
      return p?.userId ?? null;
    }
    if (targetType === 'activity') {
      const a = await this.prisma.activity.findUnique({
        where: { id: targetId },
        select: { userId: true },
      });
      return a?.userId ?? null;
    }
    return null;
  }

  private async actorName(userId: string): Promise<string> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    return u?.name?.split(' ')[0] ?? 'Alguém';
  }

  async toggleReaction(
    userId: string,
    targetType: string,
    targetId: string,
    type: string,
  ) {
    const existing = await this.prisma.reaction.findUnique({
      where: { userId_targetType_targetId: { userId, targetType, targetId } },
    });

    if (existing) {
      if (existing.type === type) {
        await this.prisma.reaction.delete({ where: { id: existing.id } });
        return { action: 'removed' };
      }
      const updated = await this.prisma.reaction.update({
        where: { id: existing.id },
        data: { type },
      });
      return { action: 'updated', reaction: updated };
    }

    const reaction = await this.prisma.reaction.create({
      data: { userId, targetType, targetId, type },
    });
    return { action: 'created', reaction };
  }

  /**
   * Curtida única (coração). Reaproveita o model Reaction (unique por
   * userId+target = 1 reação por usuário/alvo). Não diferencia tipo: qualquer
   * reação existente conta como curtida, então likes antigos (fire/clap) são
   * preservados sem migração de dados.
   */
  async toggleLike(userId: string, targetType: string, targetId: string) {
    const existing = await this.prisma.reaction.findUnique({
      where: { userId_targetType_targetId: { userId, targetType, targetId } },
    });

    if (existing) {
      await this.prisma.reaction.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.reaction.create({
        data: { userId, targetType, targetId, type: 'like' },
      });

      const ownerId = await this.targetOwnerId(targetType, targetId);
      if (ownerId && ownerId !== userId) {
        const name = await this.actorName(userId);
        void this.notifications.create({
          userId: ownerId,
          type: 'LIKE',
          actorId: userId,
          targetType,
          targetId,
          title: 'Nova curtida',
          body: `${name} curtiu ${targetType === 'post' ? 'seu post' : 'sua corrida'}.`,
        });
      }
    }

    const count = await this.prisma.reaction.count({
      where: { targetType, targetId },
    });
    return { liked: !existing, count };
  }

  async getComments(targetType: string, targetId: string) {
    return this.prisma.comment.findMany({
      where: { targetType, targetId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createComment(
    userId: string,
    targetType: string,
    targetId: string,
    body: string,
  ) {
    const comment = await this.prisma.comment.create({
      data: { userId, targetType, targetId, body },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    const ownerId = await this.targetOwnerId(targetType, targetId);
    if (ownerId && ownerId !== userId) {
      const name = await this.actorName(userId);
      const preview = body.length > 60 ? `${body.slice(0, 57)}...` : body;
      void this.notifications.create({
        userId: ownerId,
        type: 'COMMENT',
        actorId: userId,
        targetType,
        targetId,
        title: 'Novo comentário',
        body: `${name} comentou: "${preview}"`,
      });
    }

    return comment;
  }

  async deleteComment(userId: string, commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comentário não encontrado');
    if (comment.userId !== userId)
      throw new ForbiddenException('Não autorizado');
    await this.prisma.comment.delete({ where: { id: commentId } });
    return { ok: true };
  }
}
