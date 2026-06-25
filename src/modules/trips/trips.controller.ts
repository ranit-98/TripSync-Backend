import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TripRoles } from '../../common/decorators/trip-roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TripMemberGuard } from '../../common/guards/trip-member.guard';
import { TripOwnerOrAdminGuard } from '../../common/guards/trip-owner-or-admin.guard';
import { MESSAGES } from '../../common/constants/messages.constants';
import type { RequestUser } from '../../common/types/request-user.type';
import { TRIP_MEMBER_ROLES } from '../../common/constants/roles.constants';
import { MAX_IMAGE_BYTES, UploadsService } from '../uploads/uploads.service';
import {
  CreateTripDto,
  InviteMemberDto,
  UpdateMemberDto,
  UpdateTripDto,
  UploadCoverDto,
} from './dto/trip.dto';
import { TripsService } from './trips.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class TripsController {
  constructor(
    private readonly trips: TripsService,
    private readonly uploads: UploadsService,
  ) {}

  @Get('trips')
  async list(@CurrentUser() user: RequestUser, @Query() query: PaginationQueryDto) {
    const result = await this.trips.listForUser(user.id, query);
    return {
      message: MESSAGES.TRIPS.LISTED,
      data: result.items,
      pagination: result.pagination,
    };
  }

  @Post('trips')
  @UseInterceptors(
    FileInterceptor('cover', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Goa Friends Trip' },
        destination: { type: 'string', example: 'Goa, India' },
        startDate: { type: 'string', format: 'date', example: '2026-08-12' },
        endDate: { type: 'string', format: 'date', example: '2026-08-18' },
        currency: { type: 'string', example: 'INR' },
        budget: { type: 'number', example: 50000 },
        cover: { type: 'string', format: 'binary' },
        coverUrl: {
          type: 'string',
          example: 'https://res.cloudinary.com/demo/image/upload/goa-cover.jpg',
        },
        styles: {
          oneOf: [
            { type: 'array', items: { type: 'string' } },
            { type: 'string', example: '["beach","food"]' },
          ],
        },
        inviteEmail: { type: 'string', example: 'friend@example.com' },
        inviteRole: {
          type: 'string',
          enum: Object.values(TRIP_MEMBER_ROLES),
          example: TRIP_MEMBER_ROLES.VIEWER,
        },
        inviteNotes: {
          type: 'string',
          example: 'Can you help with hotel planning?',
        },
      },
      required: ['title', 'destination', 'startDate', 'endDate'],
    },
  })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateTripDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const coverUrl =
      file !== undefined
        ? await this.uploads.uploadImage(file, `trips/covers`)
        : dto.coverUrl;

    return {
      message: MESSAGES.TRIPS.CREATED,
      data: await this.trips.create(user.id, { ...dto, coverUrl }),
    };
  }

  @Get('trips/:tripId')
  @UseGuards(TripMemberGuard)
  async find(@Param('tripId') tripId: string) {
    return {
      message: MESSAGES.TRIPS.FETCHED,
      data: await this.trips.findById(tripId),
    };
  }

  @Patch('trips/:tripId')
  @UseGuards(TripMemberGuard)
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  @ApiBody({ type: UpdateTripDto })
  async update(@Param('tripId') tripId: string, @Body() dto: UpdateTripDto) {
    return {
      message: MESSAGES.TRIPS.UPDATED,
      data: await this.trips.update(tripId, dto),
    };
  }

  @Delete('trips/:tripId')
  @UseGuards(TripOwnerOrAdminGuard)
  async archive(@Param('tripId') tripId: string) {
    await this.trips.archive(tripId);
    return { message: MESSAGES.TRIPS.ARCHIVED };
  }

  @Post('trips/:tripId/cover')
  @UseGuards(TripMemberGuard)
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  @UseInterceptors(
    FileInterceptor('cover', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        cover: { type: 'string', format: 'binary' },
        coverUrl: {
          type: 'string',
          example: 'https://res.cloudinary.com/demo/image/upload/goa-cover.jpg',
        },
      },
    },
  })
  async uploadCover(
    @Param('tripId') tripId: string,
    @Body() dto: UploadCoverDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const coverUrl =
      file !== undefined
        ? await this.uploads.uploadImage(file, `trips/${tripId}/cover`)
        : dto.coverUrl;

    if (!coverUrl) {
      throw new BadRequestException('Cover image or coverUrl is required.');
    }

    return {
      message: MESSAGES.TRIPS.COVER_UPDATED,
      data: await this.trips.update(tripId, { coverUrl }),
    };
  }

  @Get('trips/:tripId/members')
  @UseGuards(TripMemberGuard)
  async members(@Param('tripId') tripId: string, @Query() query: PaginationQueryDto) {
    const result = await this.trips.listMembers(tripId, query);
    return {
      message: MESSAGES.MEMBERS.LISTED,
      data: result.items,
      pagination: result.pagination,
    };
  }

  @Post('trips/:tripId/invites')
  @UseGuards(TripMemberGuard)
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  @ApiBody({ type: InviteMemberDto })
  async invite(
    @Param('tripId') tripId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: InviteMemberDto,
  ) {
    return {
      message: MESSAGES.MEMBERS.INVITED,
      data: await this.trips.invite(tripId, user.id, dto),
    };
  }

  @Get('invites')
  async pendingInvites(@CurrentUser() user: RequestUser, @Query() query: PaginationQueryDto) {
    const result = await this.trips.listPendingInvites(user.email, query);
    return {
      message: MESSAGES.MEMBERS.INVITES_LISTED,
      data: result.items,
      pagination: result.pagination,
    };
  }

  @Patch('trips/:tripId/members/:memberId')
  @UseGuards(TripOwnerOrAdminGuard)
  @ApiBody({ type: UpdateMemberDto })
  async updateMember(
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return {
      message: MESSAGES.MEMBERS.UPDATED,
      data: await this.trips.updateMember(memberId, dto),
    };
  }

  @Delete('trips/:tripId/members/:memberId')
  @UseGuards(TripOwnerOrAdminGuard)
  async removeMember(@Param('memberId') memberId: string) {
    await this.trips.removeMember(memberId);
    return { message: MESSAGES.MEMBERS.REMOVED };
  }

  @Post('invites/:inviteId/accept')
  async acceptInvite(
    @Param('inviteId') inviteId: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.trips.acceptInvite(inviteId, user.id, user.email);
    return { message: MESSAGES.MEMBERS.ACCEPTED };
  }

  @Post('invites/:inviteId/decline')
  async declineInvite(
    @Param('inviteId') inviteId: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.trips.declineInvite(inviteId, user.email);
    return { message: MESSAGES.MEMBERS.DECLINED };
  }
}
