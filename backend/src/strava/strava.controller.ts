import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { StravaService } from './strava.service';

@ApiTags('Strava')
@Controller('auth/strava')
export class StravaController {
  constructor(private stravaService: StravaService) {}

  @Get('url')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna URL de autorização do Strava como JSON' })
  getAuthUrl(@CurrentUser() user: { id: string }) {
    return { url: this.stravaService.buildAuthUrl(user.id) };
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Redireciona para autorização do Strava' })
  redirect(@CurrentUser() user: { id: string }, @Res() res: Response) {
    const url = this.stravaService.buildAuthUrl(user.id);
    res.redirect(url);
  }

  @Get('callback')
  @Public()
  @ApiOperation({ summary: 'Callback OAuth do Strava' })
  async callback(
    @Query('code') code: string,
    @Query('state') userId: string,
    @Res() res: Response,
  ) {
    await this.stravaService.exchangeCode(userId, code);
    res.send('<h2>Strava conectado com sucesso! Pode fechar esta janela.</h2>');
  }

  @Post('sync')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sincroniza atividades do Strava no desafio ativo' })
  sync(@CurrentUser() user: { id: string }) {
    return this.stravaService.syncChallenge(user.id);
  }

  @Post('webhook')
  @Public()
  @ApiOperation({ summary: 'Recebe eventos do webhook do Strava' })
  webhook(@Body() body: Record<string, unknown>) {
    void this.stravaService.handleWebhookEvent(
      body as Parameters<StravaService['handleWebhookEvent']>[0],
    );
    return { status: 'ok' };
  }

  @Get('webhook')
  @Public()
  @ApiOperation({ summary: 'Verificação do webhook pelo Strava' })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    if (
      mode === 'subscribe' &&
      token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN
    ) {
      return { 'hub.challenge': challenge };
    }
    return { error: 'invalid token' };
  }
}
