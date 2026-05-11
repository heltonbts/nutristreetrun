import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class ToggleReactionDto {
  @ApiProperty({ enum: ['activity', 'post'] })
  @IsIn(['activity', 'post'])
  targetType: string;

  @ApiProperty()
  @IsString()
  targetId: string;

  @ApiProperty({ enum: ['fire', 'clap'] })
  @IsIn(['fire', 'clap'])
  type: string;
}
