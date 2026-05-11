import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreatePostDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  body: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  image?: any;
}
