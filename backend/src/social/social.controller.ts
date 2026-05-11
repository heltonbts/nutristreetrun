import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ToggleReactionDto } from './dto/toggle-reaction.dto';
import { SocialService } from './social.service';

@ApiTags('social')
@ApiBearerAuth()
@Controller()
export class SocialController {
  constructor(private social: SocialService) {}

  @Post('reactions')
  @ApiOperation({ summary: 'Reagir ou remover reação (toggle)' })
  toggleReaction(
    @CurrentUser() user: { id: string },
    @Body() dto: ToggleReactionDto,
  ) {
    return this.social.toggleReaction(
      user.id,
      dto.targetType,
      dto.targetId,
      dto.type,
    );
  }

  @Get('comments/:targetType/:targetId')
  @ApiOperation({ summary: 'Listar comentários de uma atividade ou post' })
  getComments(
    @Param('targetType') targetType: string,
    @Param('targetId') targetId: string,
  ) {
    return this.social.getComments(targetType, targetId);
  }

  @Post('comments')
  @ApiOperation({ summary: 'Criar comentário' })
  createComment(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateCommentDto,
  ) {
    return this.social.createComment(
      user.id,
      dto.targetType,
      dto.targetId,
      dto.body,
    );
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: 'Deletar próprio comentário' })
  deleteComment(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.social.deleteComment(user.id, id);
  }
}
