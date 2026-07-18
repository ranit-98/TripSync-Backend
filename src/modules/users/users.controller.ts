import {
  Body,
  Controller,
  Get,
  Patch,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MESSAGES } from '../../common/constants/messages.constants';
import type { RequestUser } from '../../common/types/request-user.type';
import { UploadsService } from '../uploads/uploads.service';
import { ChangePasswordDto, UpdateUserDto } from './dto/update-user.dto';
import { UserSearchQueryDto } from './dto/user-search-query.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly uploads: UploadsService,
  ) {}

  @Get('search')
  async search(
    @CurrentUser() user: RequestUser,
    @Query() query: UserSearchQueryDto,
  ) {
    const result = await this.users.search(query.q, user.id, query);
    return { data: result.items, pagination: result.pagination };
  }

  @Get('me')
  async me(@CurrentUser() user: RequestUser) {
    return {
      message: MESSAGES.USERS.PROFILE,
      data: await this.users.findProfile(user.id),
    };
  }

  @Get('me/travel-stats')
  async travelStats(@CurrentUser() user: RequestUser) {
    return {
      data: await this.users.travelStats(user.id),
    };
  }

  @Patch('me')
  @ApiBody({ type: UpdateUserDto })
  async updateMe(@CurrentUser() user: RequestUser, @Body() dto: UpdateUserDto) {
    return {
      message: MESSAGES.USERS.UPDATED,
      data: await this.users.updateProfile(user.id, dto),
    };
  }

  @Patch('me/avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: { type: 'string', format: 'binary' },
        name: { type: 'string', description: 'Optional name update' },
      },
      required: ['avatar'],
    },
  })
  async uploadAvatar(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { name?: string },
  ) {
    const avatarUrl = await this.uploads.uploadImage(
      file,
      `users/${user.id}/avatar`,
    );

    const updatePayload: { avatarUrl: string; name?: string } = { avatarUrl };

    if (body.name?.trim()) {
      updatePayload.name = body.name.trim();
    }

    return {
      message: MESSAGES.USERS.AVATAR_UPDATED,
      data: await this.users.updateProfile(user.id, updatePayload),
    };
  }

  @Patch('me/password')
  @ApiBody({ type: ChangePasswordDto })
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.users.changePassword(user.id, dto);
    return { message: MESSAGES.USERS.PASSWORD_UPDATED };
  }
}
