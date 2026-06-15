import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class ToggleLikeDto {
  @ApiProperty({ enum: ['activity', 'post'] })
  @IsIn(['activity', 'post'])
  targetType: string;

  @ApiProperty()
  @IsString()
  targetId: string;
}
