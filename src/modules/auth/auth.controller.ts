import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBody } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { HTTP_STATUS } from '../../common/constants/http-status.constants';
import { MESSAGES } from '../../common/constants/messages.constants';
import type { RequestUser } from '../../common/types/request-user.type';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @ApiBody({ type: RegisterDto })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.register(dto);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { message: MESSAGES.AUTH.REGISTERED, data: result.user };
  }

  @Post('login')
  @HttpCode(HTTP_STATUS.OK)
  @ApiBody({ type: LoginDto })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { message: MESSAGES.AUTH.LOGGED_IN, data: result.user };
  }

  @Post('refresh')
  @HttpCode(HTTP_STATUS.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshCookie = this.config.get<string>('cookies.refreshName');
    const refreshToken = req.cookies?.[refreshCookie ?? 'trip_sync_refresh'] as
      | string
      | undefined;
    if (!refreshToken) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    // Refresh JWT is verified here so stolen/expired cookies cannot mint access.
    const payload = await this.auth.verifyRefreshToken(refreshToken);
    const result = await this.auth.refresh(payload.id, refreshToken);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { message: MESSAGES.AUTH.REFRESHED, data: result.user };
  }

  @Post('logout')
  @HttpCode(HTTP_STATUS.OK)
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: RequestUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(user.id);
    this.clearAuthCookies(res);
    return { message: MESSAGES.AUTH.LOGGED_OUT };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: RequestUser) {
    return { message: MESSAGES.USERS.PROFILE, data: user };
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    const domain = this.config.get<string>('cookies.domain');
    const base = {
      httpOnly: true,
      secure: true,
      sameSite: 'none' as const,
      domain,
      path: '/',
    };

    res.cookie(
      this.config.getOrThrow<string>('cookies.accessName'),
      accessToken,
      {
        ...base,
        maxAge: 15 * 60 * 1000,
      },
    );
    res.cookie(
      this.config.getOrThrow<string>('cookies.refreshName'),
      refreshToken,
      {
        ...base,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    );
  }

  private clearAuthCookies(res: Response) {
    const domain = this.config.get<string>('cookies.domain');
    res.clearCookie(this.config.getOrThrow<string>('cookies.accessName'), {
      secure: true,
      sameSite: 'none',
      domain,
      path: '/',
    });
    res.clearCookie(this.config.getOrThrow<string>('cookies.refreshName'), {
      secure: true,
      sameSite: 'none',
      domain,
      path: '/',
    });
  }
}
