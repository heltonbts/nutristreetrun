import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assessoria?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(300)
  weightKg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(250)
  heightCm?: number;
}
