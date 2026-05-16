import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { ActivitiesModule } from './activities/activities.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { ChallengesModule } from './challenges/challenges.module';
import { FeedModule } from './feed/feed.module';
import { HomeModule } from './home/home.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PostsModule } from './posts/posts.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProfileModule } from './profile/profile.module';
import { RankingModule } from './ranking/ranking.module';
import { SocialModule } from './social/social.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'short', ttl: 1000, limit: 5 },
        { name: 'long', ttl: 60000, limit: 100 },
      ],
    }),
    PrismaModule,
    NotificationsModule,
    AuthModule,
    HomeModule,
    ChallengesModule,
    ActivitiesModule,
    RankingModule,
    ProfileModule,
    FeedModule,
    PostsModule,
    SocialModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
