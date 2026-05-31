import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { MESSAGES } from '../../common/constants/messages.constants';
import { TripRoles } from '../../common/decorators/trip-roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TripMemberGuard } from '../../common/guards/trip-member.guard';
import { TRIP_MEMBER_ROLES } from '../../common/constants/roles.constants';
import { SignUploadDto } from './dto/sign-upload.dto';
import { UploadsService } from './uploads.service';

@Controller('trips/:tripId/uploads')
@UseGuards(JwtAuthGuard, TripMemberGuard)
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('sign')
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  @ApiBody({ type: SignUploadDto })
  sign(@Param('tripId') tripId: string, @Body() dto: SignUploadDto) {
    return {
      message: MESSAGES.UPLOADS.SIGNED,
      data: this.uploads.sign(tripId, dto),
    };
  }
}
