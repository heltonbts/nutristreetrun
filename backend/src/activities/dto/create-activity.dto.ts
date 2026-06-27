import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class SplitDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  km: number;

  @ApiProperty({ example: 312.5, description: 'Pace do split em segundos/km' })
  @IsNumber()
  @Min(0)
  paceSec: number;

  @ApiPropertyOptional({
    example: 3.2,
    description: 'Delta de elevação no split (m)',
  })
  @IsOptional()
  @IsNumber()
  elevDelta?: number;
}

export const SURFACES = [
  'asfalto',
  'trilha',
  'esteira',
  'pista',
  'areia',
] as const;
export type Surface = (typeof SURFACES)[number];

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

  @ApiPropertyOptional({
    description: 'Traçado GPS encodado (Google polyline)',
    example: 'ate~F|zviO...',
  })
  @IsOptional()
  @IsString()
  routePolyline?: string;

  @ApiPropertyOptional({ example: 15, description: 'Ganho de elevação (m)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  elevationGainM?: number;

  @ApiPropertyOptional({ example: 13, description: 'Perda de elevação (m)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  elevationLossM?: number;

  @ApiPropertyOptional({
    example: 42,
    description: 'Altitude máxima atingida (m)',
  })
  @IsOptional()
  @IsInt()
  maxElevationM?: number;

  @ApiPropertyOptional({
    example: 14.3,
    description: 'Velocidade máxima (km/h)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxSpeedKph?: number;

  @ApiPropertyOptional({ example: 60, description: 'Tempo total em pausa (s)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  pauseSec?: number;

  @ApiPropertyOptional({
    type: () => [SplitDto],
    description: 'Splits por km (tempo + elevação)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitDto)
  splits?: SplitDto[];

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

  @ApiPropertyOptional({ example: 4, description: 'Como se sentiu (1–5)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  feeling?: number;

  @ApiPropertyOptional({ example: 'asfalto', enum: SURFACES })
  @IsOptional()
  @IsIn(SURFACES)
  surface?: Surface;

  @ApiPropertyOptional({ example: 'Treino leve domingo de manhã' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({
    example: 'AppleHealth',
    enum: ['Manual', 'AppleHealth'],
    description: 'Origem da atividade (padrão: Manual)',
  })
  @IsOptional()
  @IsIn(['Manual', 'AppleHealth'])
  source?: 'Manual' | 'AppleHealth';

  @ApiPropertyOptional({
    description: 'ID externo (uuid do HKWorkout) — usado p/ deduplicar importações',
  })
  @IsOptional()
  @IsString()
  externalId?: string;
}
