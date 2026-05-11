import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ChallengesService } from './challenges.service';

@ApiTags('Challenges')
@ApiBearerAuth()
@Controller('challenges')
export class ChallengesController {
  constructor(private challengesService: ChallengesService) {}

  @Get('current')
  @ApiOperation({ summary: 'Desafios disponíveis no mês atual' })
  getCurrent() {
    return this.challengesService.getCurrent();
  }

  @Post('join')
  @ApiOperation({ summary: 'Entra em um desafio' })
  join(
    @CurrentUser() user: { id: string },
    @Body() body: { challengeId: string },
  ) {
    return this.challengesService.join(user.id, body.challengeId);
  }
}
