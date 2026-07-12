import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MESSAGES } from '../../common/constants/messages.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { RequestUser } from '../../common/types/request-user.type';
import { NotificationsService } from './notifications.service';
import { NotificationListQueryDto } from '../../common/dto/pagination-query.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async list(
    @CurrentUser() user: RequestUser,
    @Query() query: NotificationListQueryDto,
  ) {
    const result = await this.notifications.list(user.id, query);
    return {
      message: MESSAGES.NOTIFICATIONS.LISTED,
      data: result.items,
      pagination: result.pagination,
      notificationCounts: result.counts,
    };
  }

  @Patch('read-all')
  async readAll(@CurrentUser() user: RequestUser) {
    await this.notifications.markAllRead(user.id);
    return { message: MESSAGES.NOTIFICATIONS.READ_ALL };
  }

  @Patch(':notificationId/read')
  async read(
    @CurrentUser() user: RequestUser,
    @Param('notificationId') notificationId: string,
  ) {
    return {
      message: MESSAGES.NOTIFICATIONS.READ,
      data: await this.notifications.markRead(user.id, notificationId),
    };
  }

  @Delete(':notificationId')
  async delete(
    @CurrentUser() user: RequestUser,
    @Param('notificationId') notificationId: string,
  ) {
    await this.notifications.delete(user.id, notificationId);
    return { message: MESSAGES.NOTIFICATIONS.DELETED };
  }
}
