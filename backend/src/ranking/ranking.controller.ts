import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RankingService } from './ranking.service';

@ApiTags('Ranking')
@ApiBearerAuth()
@Controller('ranking')
export class RankingController {
  constructor(private rankingService: RankingService) {}

  @Get()
  @ApiOperation({
    summary: 'Ranking do desafio ativo por cidade, estado ou assessoria',
  })
  @ApiQuery({ name: 'scope', enum: ['city', 'state', 'club'], required: false })
  getRanking(
    @CurrentUser() user: { id: string },
    @Query('scope') scope: 'city' | 'state' | 'club' = 'city',
  ) {
    const validScopes = ['city', 'state', 'club'];
    const s = validScopes.includes(scope) ? scope : 'city';
    return this.rankingService.getRanking(user.id, s);
  }
}
