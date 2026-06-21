import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { RequestUser } from '../../common/types/request-user.type';
import { DashboardService, type DashboardPeriod } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  async overview(
    @CurrentUser() user: RequestUser,
    @Query('period') period: DashboardPeriod = 'half-year',
  ) {
    return { data: await this.dashboard.overview(user.id, period) };
  }
}
