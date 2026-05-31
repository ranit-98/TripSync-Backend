import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TripRoles } from '../../common/decorators/trip-roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TripMemberGuard } from '../../common/guards/trip-member.guard';
import { TripOwnerOrAdminGuard } from '../../common/guards/trip-owner-or-admin.guard';
import { MESSAGES } from '../../common/constants/messages.constants';
import type { RequestUser } from '../../common/types/request-user.type';
import { TRIP_MEMBER_ROLES } from '../../common/constants/roles.constants';
import {
  CreateTripDto,
  InviteMemberDto,
  UpdateMemberDto,
  UpdateTripDto,
  UploadCoverDto,
} from './dto/trip.dto';
import { TripsService } from './trips.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Get('trips')
  async list(@CurrentUser() user: RequestUser) {
    return {
      message: MESSAGES.TRIPS.LISTED,
      data: await this.trips.listForUser(user.id),
    };
  }

  @Post('trips')
  @ApiBody({ type: CreateTripDto })
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateTripDto) {
    return {
      message: MESSAGES.TRIPS.CREATED,
      data: await this.trips.create(user.id, dto),
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
  @ApiBody({ type: UploadCoverDto })
  async uploadCover(
    @Param('tripId') tripId: string,
    @Body() dto: UploadCoverDto,
  ) {
    return {
      message: MESSAGES.TRIPS.COVER_UPDATED,
      data: await this.trips.update(tripId, { coverUrl: dto.coverUrl }),
    };
  }

  @Get('trips/:tripId/members')
  @UseGuards(TripMemberGuard)
  async members(@Param('tripId') tripId: string) {
    return {
      message: MESSAGES.MEMBERS.LISTED,
      data: await this.trips.listMembers(tripId),
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
