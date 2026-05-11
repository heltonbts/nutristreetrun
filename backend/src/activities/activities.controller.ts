import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
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

  @Get('chart-data')
  @ApiOperation({ summary: 'Dados históricos para gráficos (últimos N meses)' })
  @ApiQuery({ name: 'months', required: false, type: Number })
  getChartData(
    @CurrentUser() user: { id: string },
    @Query('months', new ParseIntPipe({ optional: true })) months?: number,
  ) {
    return this.activitiesService.getChartData(user.id, months ?? 6);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumo mensal com comparação ao mês anterior' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  getSummary(
    @CurrentUser() user: { id: string },
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
    @Query('month', new ParseIntPipe({ optional: true })) month?: number,
  ) {
    const now = new Date();
    return this.activitiesService.getSummary(
      user.id,
      year ?? now.getFullYear(),
      month ?? now.getMonth() + 1,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de uma atividade' })
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.activitiesService.findOne(user.id, id);
  }
}
