import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreatePostDto } from './dto/create-post.dto';
import { PostsService } from './posts.service';

@ApiTags('posts')
@ApiBearerAuth()
@Controller('posts')
export class PostsController {
  constructor(private posts: PostsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar post com texto e foto opcional' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  createPost(
    @CurrentUser() user: { id: string },
    @Body() dto: CreatePostDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.posts.createPost(user.id, dto.body, image?.buffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de um post (formato do feed)' })
  getPost(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.posts.getPost(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar próprio post' })
  deletePost(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.posts.deletePost(user.id, id);
  }
}
