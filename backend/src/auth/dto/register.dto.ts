import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsMobilePhone } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Rafael Mendes' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'rafael@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+5511999999999' })
  @IsMobilePhone('pt-BR')
  phone: string;

  @ApiProperty({ example: 'senha123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}
