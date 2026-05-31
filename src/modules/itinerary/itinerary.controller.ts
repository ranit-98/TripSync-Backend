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
import { MESSAGES } from '../../common/constants/messages.constants';
import { TripRoles } from '../../common/decorators/trip-roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TripMemberGuard } from '../../common/guards/trip-member.guard';
import { TRIP_MEMBER_ROLES } from '../../common/constants/roles.constants';
import {
  CreateActivityDto,
  CreateDayDto,
  ReorderActivitiesDto,
  UpdateActivityDto,
  UpdateDayDto,
} from './dto/itinerary.dto';
import { ItineraryService } from './itinerary.service';

@Controller('trips/:tripId')
@UseGuards(JwtAuthGuard, TripMemberGuard)
export class ItineraryController {
  constructor(private readonly itinerary: ItineraryService) {}

  @Get('itinerary')
  async get(@Param('tripId') tripId: string) {
    return {
      message: MESSAGES.ITINERARY.FETCHED,
      data: await this.itinerary.getItinerary(tripId),
    };
  }

  @Post('days')
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  @ApiBody({ type: CreateDayDto })
  async createDay(@Param('tripId') tripId: string, @Body() dto: CreateDayDto) {
    return {
      message: MESSAGES.ITINERARY.DAY_CREATED,
      data: await this.itinerary.createDay(tripId, dto),
    };
  }

  @Patch('days/:dayId')
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  @ApiBody({ type: UpdateDayDto })
  async updateDay(@Param('dayId') dayId: string, @Body() dto: UpdateDayDto) {
    return {
      message: MESSAGES.ITINERARY.DAY_UPDATED,
      data: await this.itinerary.updateDay(dayId, dto),
    };
  }

  @Delete('days/:dayId')
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  async deleteDay(@Param('dayId') dayId: string) {
    await this.itinerary.deleteDay(dayId);
    return { message: MESSAGES.ITINERARY.DAY_DELETED };
  }

  @Post('activities')
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  @ApiBody({ type: CreateActivityDto })
  async createActivity(
    @Param('tripId') tripId: string,
    @Body() dto: CreateActivityDto,
  ) {
    return {
      message: MESSAGES.ITINERARY.ACTIVITY_CREATED,
      data: await this.itinerary.createActivity(tripId, dto),
    };
  }

  @Patch('activities/reorder')
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  @ApiBody({ type: ReorderActivitiesDto })
  async reorder(@Body() dto: ReorderActivitiesDto) {
    await this.itinerary.reorder(dto);
    return { message: MESSAGES.ITINERARY.ACTIVITIES_REORDERED };
  }

  @Patch('activities/:activityId')
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  @ApiBody({ type: UpdateActivityDto })
  async updateActivity(
    @Param('activityId') activityId: string,
    @Body() dto: UpdateActivityDto,
  ) {
    return {
      message: MESSAGES.ITINERARY.ACTIVITY_UPDATED,
      data: await this.itinerary.updateActivity(activityId, dto),
    };
  }

  @Delete('activities/:activityId')
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  async deleteActivity(@Param('activityId') activityId: string) {
    await this.itinerary.deleteActivity(activityId);
    return { message: MESSAGES.ITINERARY.ACTIVITY_DELETED };
  }
}
