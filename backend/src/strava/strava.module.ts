import { Module } from '@nestjs/common';

import { StravaController } from './strava.controller';
import { StravaService } from './strava.service';

@Module({
  controllers: [StravaController],
  providers: [StravaService],
  exports: [StravaService],
})
export class StravaModule {}
