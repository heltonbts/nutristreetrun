import { Controller, Get, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar notificações (paginado por cursor)' })
  list(
    @CurrentUser() user: { id: string },
    @Query('cursor') cursor?: string,
  ) {
    return this.notifications.list(user.id, cursor);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Contador de notificações não lidas' })
  unreadCount(@CurrentUser() user: { id: string }) {
    return this.notifications.unreadCount(user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marcar todas como lidas' })
  markAllRead(@CurrentUser() user: { id: string }) {
    return this.notifications.markAllRead(user.id);
  }
}
