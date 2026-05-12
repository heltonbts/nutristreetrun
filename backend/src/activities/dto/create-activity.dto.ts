import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateActivityDto {
  @ApiPropertyOptional({ example: 'Corrida da manhã' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 10.5, description: 'Distância em km' })
  @IsNumber()
  @Min(0.1)
  distanceKm: number;

  @ApiProperty({ example: 3600, description: 'Duração total em segundos' })
  @IsNumber()
  @Min(1)
  durationSeconds: number;

  @ApiPropertyOptional({ example: '2026-05-12T07:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @ApiPropertyOptional({ example: 148 })
  @IsOptional()
  @IsInt()
  avgHeartRate?: number;

  @ApiPropertyOptional({ example: 172 })
  @IsOptional()
  @IsInt()
  maxHeartRate?: number;

  @ApiPropertyOptional({ example: 420 })
  @IsOptional()
  @IsNumber()
  caloriesBurned?: number;
}
