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

  async deletePost(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post não encontrado');
    if (post.userId !== userId) throw new ForbiddenException('Não autorizado');
    await this.prisma.post.delete({ where: { id: postId } });
    return { ok: true };
  }
}
