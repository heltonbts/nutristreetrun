import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

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
        this.logger.warn(`Expo Push API returned ${res.status}`);
      }
    } catch (err) {
      this.logger.warn('Push send error', err);
    }
  }
}
