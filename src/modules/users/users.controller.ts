import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MESSAGES } from '../../common/constants/messages.constants';
import type { RequestUser } from '../../common/types/request-user.type';
import { ChangePasswordDto, UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  async me(@CurrentUser() user: RequestUser) {
    return {
      message: MESSAGES.USERS.PROFILE,
      data: await this.users.findProfile(user.id),
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
