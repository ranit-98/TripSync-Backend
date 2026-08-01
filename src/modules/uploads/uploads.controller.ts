import {
  Body,
  Controller,
  ForbiddenException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import type { Request } from 'express';
import { MESSAGES } from '../../common/constants/messages.constants';
import { TripRoles } from '../../common/decorators/trip-roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TripMemberGuard } from '../../common/guards/trip-member.guard';
import {
  TRIP_MEMBER_ROLES,
  type TripMemberRole,
} from '../../common/constants/roles.constants';
import { SignUploadDto } from './dto/sign-upload.dto';
import { UploadsService } from './uploads.service';

type TripMemberRequest = Request & {
  tripMember?: {
    role: TripMemberRole;
  };
};

@Controller('trips/:tripId/uploads')
@UseGuards(JwtAuthGuard, TripMemberGuard)
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('sign')
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR, TRIP_MEMBER_ROLES.VIEWER)
  @ApiBody({ type: SignUploadDto })
  sign(
    @Param('tripId') tripId: string,
    @Body() dto: SignUploadDto,
    @Req() request: TripMemberRequest,
  ) {
    if (
      request.tripMember?.role === TRIP_MEMBER_ROLES.VIEWER &&
      dto.target !== 'chat'
    ) {
      throw new ForbiddenException(MESSAGES.COMMON.FORBIDDEN);
    }

    return {
      message: MESSAGES.UPLOADS.SIGNED,
      data: this.uploads.sign(tripId, dto),
    };
  }
}
