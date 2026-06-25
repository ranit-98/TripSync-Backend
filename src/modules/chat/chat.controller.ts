import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { MESSAGES } from '../../common/constants/messages.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TripRoles } from '../../common/decorators/trip-roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TripMemberGuard } from '../../common/guards/trip-member.guard';
import type { RequestUser } from '../../common/types/request-user.type';
import { TRIP_MEMBER_ROLES } from '../../common/constants/roles.constants';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { CreateAttachmentDto, CreateMessageDto } from './dto/chat.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Controller('trips/:tripId/messages')
@UseGuards(JwtAuthGuard, TripMemberGuard)
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get()
  async history(@Param('tripId') tripId: string, @Query() query: PaginationQueryDto) {
    const result = await this.chat.history(tripId, query);
    return {
      message: MESSAGES.CHAT.HISTORY,
      data: result.items,
      pagination: result.pagination,
    };
  }

  @Post()
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  @ApiBody({ type: CreateMessageDto })
  async send(
    @Param('tripId') tripId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateMessageDto,
  ) {
    const message = await this.chat.send(tripId, user.id, dto);
    this.chatGateway.emitMessageCreated(tripId, message);

    return {
      message: MESSAGES.CHAT.SENT,
      data: message,
    };
  }

  @Post(':messageId/attachments')
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  @ApiBody({ type: CreateAttachmentDto })
  async attach(
    @Param('messageId') messageId: string,
    @Body() dto: CreateAttachmentDto,
  ) {
    return {
      message: MESSAGES.CHAT.ATTACHMENT_ADDED,
      data: await this.chat.attach(messageId, dto),
    };
  }

  @Delete(':messageId')
  async delete(
    @Param('tripId') tripId: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.chat.delete(messageId, user.id, user.role);
    this.chatGateway.emitMessageDeleted(tripId, messageId);

    return { message: MESSAGES.CHAT.DELETED };
  }
}
