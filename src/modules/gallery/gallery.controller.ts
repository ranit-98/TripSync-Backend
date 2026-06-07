import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  ParseFilePipeBuilder,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { MESSAGES } from '../../common/constants/messages.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TripRoles } from '../../common/decorators/trip-roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TripMemberGuard } from '../../common/guards/trip-member.guard';
import type { RequestUser } from '../../common/types/request-user.type';
import { TRIP_MEMBER_ROLES } from '../../common/constants/roles.constants';
import { MAX_IMAGE_BYTES } from '../uploads/uploads.service';
import { CreatePhotoDto, UpdatePhotoDto } from './dto/gallery.dto';
import { GalleryService } from './gallery.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class GalleryController {
  constructor(private readonly gallery: GalleryService) {}

  @Get('albums')
  async albums(@CurrentUser() user: RequestUser) {
    return {
      message: MESSAGES.GALLERY.ALBUMS,
      data: await this.gallery.albums(user.id),
    };
  }

  @Get('albums/:tripId')
  @UseGuards(TripMemberGuard)
  async album(@Param('tripId') tripId: string) {
    return {
      message: MESSAGES.GALLERY.LISTED,
      data: await this.gallery.list(tripId),
    };
  }

  @Get('trips/:tripId/photos')
  @UseGuards(TripMemberGuard)
  async list(@Param('tripId') tripId: string) {
    return {
      message: MESSAGES.GALLERY.LISTED,
      data: await this.gallery.list(tripId),
    };
  }

  @Post('trips/:tripId/photos')
  @UseGuards(TripMemberGuard)
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreatePhotoDto })
  async create(
    @Param('tripId') tripId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreatePhotoDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(jpeg|jpg|png|webp|gif)$/ })
        .addMaxSizeValidator({ maxSize: MAX_IMAGE_BYTES })
        .build({ fileIsRequired: true }),
    )
    image: Express.Multer.File,
  ) {
    return {
      message: MESSAGES.GALLERY.CREATED,
      data: await this.gallery.create(tripId, user.id, dto, image),
    };
  }

  @Patch('trips/:tripId/photos/:photoId')
  @UseGuards(TripMemberGuard)
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  @ApiBody({ type: UpdatePhotoDto })
  async update(@Param('photoId') photoId: string, @Body() dto: UpdatePhotoDto) {
    return {
      message: MESSAGES.GALLERY.UPDATED,
      data: await this.gallery.update(photoId, dto),
    };
  }

  @Delete('trips/:tripId/photos/:photoId')
  @UseGuards(TripMemberGuard)
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  async delete(@Param('photoId') photoId: string) {
    await this.gallery.delete(photoId);
    return { message: MESSAGES.GALLERY.DELETED };
  }
}
