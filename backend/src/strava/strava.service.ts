import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const STRAVA_API = 'https://www.strava.com/api/v3';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';

// Pace limite: 9 min/km = 540 s/km. Abaixo disso conta como corrida válida.
const MAX_PACE_SEC_PER_KM = 540;

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: { id: number };
}

interface StravaActivity {
  id: number;
  name: string;
  type: string;
  distance: number; // metros
  moving_time: number; // segundos
  start_date: string;
  average_speed: number; // m/s
}

@Injectable()
export class StravaService {
  private readonly logger = new Logger(StravaService.name);

  constructor(private prisma: PrismaService) {}

  buildAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: process.env.STRAVA_CLIENT_ID!,
      redirect_uri: process.env.STRAVA_REDIRECT_URI!,
      response_type: 'code',
      approval_prompt: 'auto',
      scope: 'activity:read_all',
      state,
    });
    return `https://www.strava.com/oauth/authorize?${params.toString()}`;
  }

  async exchangeCode(userId: string, code: string): Promise<void> {
    const res = await fetch(STRAVA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    const data = (await res.json()) as StravaTokenResponse;

    await this.prisma.stravaConnection.upsert({
      where: { userId },
      update: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(data.expires_at * 1000),
        stravaId: data.athlete.id,
      },
      create: {
        userId,
        stravaId: data.athlete.id,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(data.expires_at * 1000),
      },
    });
  }

  async syncChallenge(userId: string): Promise<{ synced: number }> {
    const now = new Date();
    const challenge = await this.prisma.challenge.findFirst({
      where: { startsAt: { lte: now }, endsAt: { gte: now } },
    });

    const from = challenge
      ? challenge.startsAt
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = challenge ? challenge.endsAt : now;

    const token = await this.getValidToken(userId);

    const params = new URLSearchParams({
      after: String(Math.floor(from.getTime() / 1000)),
      before: String(Math.floor(to.getTime() / 1000)),
      per_page: '200',
    });

    const res = await fetch(
      `${STRAVA_API}/athlete/activities?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    const activities = (await res.json()) as StravaActivity[];
    await Promise.all(
      activities.map((a) => this.syncActivity(userId, a.id, token)),
    );

    return { synced: activities.length };
  }

  async handleWebhookEvent(event: {
    object_type: string;
    aspect_type: string;
    object_id: number;
    owner_id: number;
  }): Promise<void> {
    if (event.object_type !== 'activity' || event.aspect_type !== 'create')
      return;

    const connection = await this.prisma.stravaConnection.findUnique({
      where: { stravaId: event.owner_id },
    });

    if (!connection) {
      this.logger.warn(`Strava owner ${event.owner_id} não encontrado`);
      return;
    }

    const token = await this.getValidToken(connection.userId);
    await this.syncActivity(connection.userId, event.object_id, token);
  }

  private async syncActivity(
    userId: string,
    stravaActivityId: number,
    token: string,
  ): Promise<void> {
    const res = await fetch(`${STRAVA_API}/activities/${stravaActivityId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const act = (await res.json()) as StravaActivity;

    const isRun = ['Run', 'TrailRun', 'VirtualRun'].includes(act.type);
    const distanceKm = act.distance / 1000;
    const paceSecPerKm = distanceKm > 0 ? act.moving_time / distanceKm : 9999;
    const counts = isRun && paceSecPerKm <= MAX_PACE_SEC_PER_KM;
    const skipReason = !isRun
      ? `${act.type} não é corrida`
      : paceSecPerKm > MAX_PACE_SEC_PER_KM
        ? 'Pace fora do critério'
        : undefined;

    const paceFormatted =
      distanceKm > 0
        ? `${Math.floor(paceSecPerKm / 60)}'${String(Math.round(paceSecPerKm % 60)).padStart(2, '0')}"`
        : undefined;

    await this.prisma.activity.upsert({
      where: { stravaId: stravaActivityId },
      update: {},
      create: {
        userId,
        stravaId: stravaActivityId,
        title: act.name,
        distanceKm: Math.round(distanceKm * 10) / 10,
        pace: paceFormatted,
        source: 'Strava',
        counts,
        skipReason,
        startedAt: new Date(act.start_date),
      },
    });
  }

  private async getValidToken(userId: string): Promise<string> {
    const conn = await this.prisma.stravaConnection.findUniqueOrThrow({
      where: { userId },
    });

    if (conn.expiresAt > new Date()) return conn.accessToken;

    const res = await fetch(STRAVA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: conn.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = (await res.json()) as StravaTokenResponse;

    await this.prisma.stravaConnection.update({
      where: { userId },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(data.expires_at * 1000),
      },
    });

    return data.access_token;
  }
}
