import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { MESSAGES } from '../../common/constants/messages.constants';
import type { RequestUser } from '../../common/types/request-user.type';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

const timeUnitsInSeconds = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
} as const;

function tokenTtlSeconds(value: string | undefined, fallbackSeconds: number) {
  if (!value) {
    return fallbackSeconds;
  }

  const match = /^(\d+)([smhd])?$/.exec(value.trim());
  if (!match) {
    return fallbackSeconds;
  }

  const amount = Number(match[1]);
  const unit = match[2] as keyof typeof timeUnitsInSeconds | undefined;
  return amount * timeUnitsInSeconds[unit ?? 's'];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException(MESSAGES.AUTH.EMAIL_EXISTS);
    }

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email,
        passwordHash: await bcrypt.hash(dto.password, 12),
      },
    });

    const tokens = await this.issueTokens(user);
    await this.persistRefreshToken(user.id, tokens.refreshToken);
    return { user: this.toProfile(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    const tokens = await this.issueTokens(user);
    await this.persistRefreshToken(user.id, tokens.refreshToken);
    return { user: this.toProfile(user), ...tokens };
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (
      !user?.refreshTokenHash ||
      !(await bcrypt.compare(refreshToken, user.refreshTokenHash))
    ) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    const tokens = await this.issueTokens(user);
    await this.persistRefreshToken(user.id, tokens.refreshToken);
    return { user: this.toProfile(user), ...tokens };
  }

  verifyRefreshToken(refreshToken: string) {
    return this.jwt.verifyAsync<RequestUser>(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh-secret',
    });
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }

  private async issueTokens(user: User) {
    const payload: RequestUser = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access-secret',
        expiresIn: tokenTtlSeconds(process.env.JWT_ACCESS_TTL, 15 * 60),
      }),
      this.jwt.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh-secret',
        expiresIn: tokenTtlSeconds(
          process.env.JWT_REFRESH_TTL,
          7 * 24 * 60 * 60,
        ),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async persistRefreshToken(userId: string, token: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: await bcrypt.hash(token, 12),
      },
    });
  }

  toProfile(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
