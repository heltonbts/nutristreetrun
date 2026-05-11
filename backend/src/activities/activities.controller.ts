import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ActivitiesService } from './activities.service';

@ApiTags('Activities')
@ApiBearerAuth()
@Controller('activities')
export class ActivitiesController {
  constructor(private activitiesService: ActivitiesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista atividades do usuário (padrão: mês atual)' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  findAll(
    @CurrentUser() user: { id: string },
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.activitiesService.findAll(
      user.id,
      year ? +year : undefined,
      month ? +month : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de uma atividade' })
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.activitiesService.findOne(user.id, id);
  }
}
