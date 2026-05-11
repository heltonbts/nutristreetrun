import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MinLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ enum: ['activity', 'post'] })
  @IsIn(['activity', 'post'])
  targetType: string;

  @ApiProperty()
  @IsString()
  targetId: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  body: string;
}
