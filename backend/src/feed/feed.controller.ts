import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FeedService } from './feed.service';

@ApiTags('feed')
@ApiBearerAuth()
@Controller('feed')
export class FeedController {
  constructor(private feed: FeedService) {}

  @Get()
  @ApiOperation({ summary: 'Feed social paginado e pontuado por relevância' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  getFeed(@CurrentUser() user: { id: string }, @Query('page') page = '1') {
    return this.feed.getFeed(user.id, Math.max(1, parseInt(page, 10) || 1));
  }
}
