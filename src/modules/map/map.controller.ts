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
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';
import { MapService } from './map.service';

@Controller('trips/:tripId')
@UseGuards(JwtAuthGuard, TripMemberGuard)
export class MapController {
  constructor(private readonly map: MapService) {}

  @Get('locations')
  async list(@Param('tripId') tripId: string) {
    return { message: MESSAGES.MAP.LISTED, data: await this.map.list(tripId) };
  }

  @Post('locations')
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  @ApiBody({ type: CreateLocationDto })
  async create(
    @Param('tripId') tripId: string,
    @Body() dto: CreateLocationDto,
  ) {
    return {
      message: MESSAGES.MAP.CREATED,
      data: await this.map.create(tripId, dto),
    };
  }

  @Patch('locations/:locationId')
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  @ApiBody({ type: UpdateLocationDto })
  async update(
    @Param('locationId') locationId: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return {
      message: MESSAGES.MAP.UPDATED,
      data: await this.map.update(locationId, dto),
    };
  }

  @Delete('locations/:locationId')
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  async delete(@Param('locationId') locationId: string) {
    await this.map.delete(locationId);
    return { message: MESSAGES.MAP.DELETED };
  }

  @Post('routes/optimize')
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  optimize() {
    return { message: MESSAGES.MAP.OPTIMIZED, data: { optimized: false } };
  }
}
