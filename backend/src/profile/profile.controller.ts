import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProfileService } from './profile.service';

@ApiTags('Profile')
@ApiBearerAuth()
@Controller('profile')
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Perfil do usuário autenticado' })
  getProfile(@CurrentUser() user: { id: string }) {
    return this.profileService.getProfile(user.id);
  }
}
