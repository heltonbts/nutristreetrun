import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Perfil público de um usuário' })
  getProfile(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.users.getPublicProfile(id, user.id);
  }

  @Get(':id/grid')
  @ApiOperation({ summary: 'Grid de publicações (posts + corridas) do usuário' })
  getGrid(@Param('id') id: string, @Query('page') page?: string) {
    return this.users.getGrid(id, Number(page) || 1);
  }

  @Get(':id/followers')
  @ApiOperation({ summary: 'Seguidores do usuário' })
  getFollowers(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.users.listFollowers(id, user.id);
  }

  @Get(':id/following')
  @ApiOperation({ summary: 'Quem o usuário segue' })
  getFollowing(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.users.listFollowing(id, user.id);
  }

  @Post(':id/follow')
  @ApiOperation({ summary: 'Seguir um usuário' })
  follow(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.users.follow(user.id, id);
  }

  @Delete(':id/follow')
  @ApiOperation({ summary: 'Deixar de seguir um usuário' })
  unfollow(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.users.unfollow(user.id, id);
  }
}
