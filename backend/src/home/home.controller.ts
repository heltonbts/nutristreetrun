import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { HomeService } from './home.service';

@ApiTags('Home')
@ApiBearerAuth()
@Controller('home')
export class HomeController {
  constructor(private homeService: HomeService) {}

  @Get()
  @ApiOperation({
    summary: 'Dados da home: desafio ativo, ranking e atividades recentes',
  })
  getHome(@CurrentUser() user: { id: string }) {
    return this.homeService.getHome(user.id);
  }
}
