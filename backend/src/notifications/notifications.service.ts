import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

interface CreateNotificationInput {
  /** destinatário */
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  /** quem causou (curtiu/comentou/seguiu/ultrapassou) */
  actorId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  /** dados extras pro payload do push (deep-link no app) */
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Push puro via Expo (sem persistir). Mantido pra notificações que não
   * viram item na central (ex.: recorde pessoal, progresso de meta).
   */
  async send(
    token: string | null | undefined,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    if (!token?.startsWith('ExponentPushToken')) return;

    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          to: token,
          title,
          body,
          data,
          sound: 'default',
        }),
      });

      if (!res.ok) {
        this.logger.warn(`Expo Push API HTTP ${res.status}`);
        return;
      }

      // A Expo responde 200 mesmo com erro: o status real vem no corpo do
      // ticket. Sem checar isso, falhas (ex.: APNs sem credencial) ficam mudas.
      const json = (await res.json()) as {
        data?: { status?: string; message?: string; details?: { error?: string } };
        errors?: { message?: string }[];
      };
      const ticket = json?.data;

      if (json?.errors?.length) {
        this.logger.warn(`Expo Push erro: ${json.errors[0]?.message}`);
      } else if (ticket?.status === 'error') {
        this.logger.warn(
          `Expo Push ticket erro [${ticket.details?.error}]: ${ticket.message}`,
        );
        // Token morto: remove pra não insistir em quem desinstalou/revogou.
        if (ticket.details?.error === 'DeviceNotRegistered') {
          await this.prisma.user
            .updateMany({ where: { pushToken: token }, data: { pushToken: null } })
            .catch(() => undefined);
        }
      }
    } catch (err) {
      this.logger.warn('Push send error', err);
    }
  }

  /**
   * Cria a notificação na central (persistida) E dispara o push.
   * Ignora notificação pra si mesmo (actor === destinatário).
   */
  async create(input: CreateNotificationInput): Promise<void> {
    if (input.actorId && input.actorId === input.userId) return;

    try {
      await this.prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          actorId: input.actorId ?? null,
          targetType: input.targetType ?? null,
          targetId: input.targetId ?? null,
          title: input.title,
          body: input.body,
        },
      });
    } catch (err) {
      this.logger.warn('Notification persist error', err);
      return;
    }

    const recipient = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { pushToken: true },
    });

    void this.send(recipient?.pushToken, input.title, input.body, {
      type: input.type,
      targetType: input.targetType,
      targetId: input.targetId,
      ...input.data,
    });
  }

  async list(userId: string, cursor?: string, take = 30) {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      include: {
        actor: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;

    return {
      items: items.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        read: n.read,
        createdAt: n.createdAt,
        targetType: n.targetType,
        targetId: n.targetId,
        actor: n.actor,
      })),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { userId, read: false },
    });
    return { count };
  }

  async markAllRead(userId: string): Promise<{ ok: true }> {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { ok: true };
  }
}
