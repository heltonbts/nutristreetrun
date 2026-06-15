import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SocialService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.comment.create({
      data: { userId, targetType, targetId, body },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
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
