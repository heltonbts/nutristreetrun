import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

import { PrismaService } from '../prisma/prisma.service';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async createPost(userId: string, body: string, imageBuffer?: Buffer) {
    let imageUrl: string | undefined;

    if (imageBuffer) {
      const result = await new Promise<{ secure_url: string }>(
        (resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              {
                folder: 'nsr/posts',
                // Retrato 4:5 (estilo Instagram). gravity 'auto' centraliza no
                // assunto principal da foto ao recortar.
                transformation: [
                  {
                    width: 1080,
                    height: 1350,
                    crop: 'fill',
                    gravity: 'auto',
                  },
                ],
              },
              (err, res) => {
                if (err || !res)
                  return reject(new Error(err?.message ?? 'Upload failed'));
                resolve(res);
              },
            )
            .end(imageBuffer);
        },
      );
      imageUrl = result.secure_url;
    }

    return this.prisma.post.create({
      data: { userId, body, imageUrl },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true, assessoria: true },
        },
      },
    });
  }

  /** Post único no mesmo formato dos itens de post do feed (tela de detalhe). */
  async getPost(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true, assessoria: true },
        },
      },
    });
    if (!post) throw new NotFoundException('Post não encontrado');

    const [likesCount, commentsCount, myLike, comments] = await Promise.all([
      this.prisma.reaction.count({
        where: { targetType: 'post', targetId: postId },
      }),
      this.prisma.comment.count({
        where: { targetType: 'post', targetId: postId },
      }),
      this.prisma.reaction.findFirst({
        where: { targetType: 'post', targetId: postId, userId },
        select: { id: true },
      }),
      this.prisma.comment.findMany({
        where: { targetType: 'post', targetId: postId },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        take: 2,
      }),
    ]);

    return {
      id: post.id,
      user: {
        id: post.user.id,
        name: post.user.name,
        avatarUrl: post.user.avatarUrl,
        assessoria: post.user.assessoria,
      },
      body: post.body,
      imageUrl: post.imageUrl,
      createdAt: post.createdAt,
      likesCount,
      likedByMe: !!myLike,
      commentsCount,
      // Cronológico (mais antigo no topo), igual à prévia do feed.
      topComments: comments.reverse().map((c) => ({
        id: c.id,
        body: c.body,
        user: { id: c.user.id, name: c.user.name, avatarUrl: c.user.avatarUrl },
      })),
    };
  }

  async deletePost(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post não encontrado');
    if (post.userId !== userId) throw new ForbiddenException('Não autorizado');
    await this.prisma.post.delete({ where: { id: postId } });
    return { ok: true };
  }
}
