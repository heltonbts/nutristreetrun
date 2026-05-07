import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Rafael Mendes' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'rafael@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'senha123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}
