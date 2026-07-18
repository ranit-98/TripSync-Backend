import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { MESSAGES } from '../../common/constants/messages.constants';
import type { RequestUser } from '../../common/types/request-user.type';
import { User, type UserDocument } from '../../database/schemas';
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
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const existingUser = await this.users.exists({ email }).exec();
    if (existingUser) {
      throw new ConflictException(MESSAGES.AUTH.EMAIL_EXISTS);
    }

    let user: UserDocument;
    try {
      user = await this.users.create({
        name: dto.name,
        email,
        passwordHash: await bcrypt.hash(dto.password, 12),
      });
    } catch (error: unknown) {
      // The exists check gives a quick response, while the unique index is the
      // final protection when two registrations race each other in production.
      if (this.isDuplicateEmailError(error)) {
        throw new ConflictException(MESSAGES.AUTH.EMAIL_EXISTS);
      }
      throw error;
    }

    const tokens = await this.issueTokens(user);
    await this.persistRefreshToken(String(user.id), tokens.refreshToken);
    return { user: this.toProfile(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.users
      .findOne({ email: dto.email.toLowerCase() })
      .exec();
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    const tokens = await this.issueTokens(user);
    await this.persistRefreshToken(String(user.id), tokens.refreshToken);
    return { user: this.toProfile(user), ...tokens };
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.users.findOne({ id: userId }).exec();
    if (
      !user?.refreshTokenHash ||
      !(await bcrypt.compare(refreshToken, user.refreshTokenHash))
    ) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    const tokens = await this.issueTokens(user);
    await this.persistRefreshToken(String(user.id), tokens.refreshToken);
    return { user: this.toProfile(user), ...tokens };
  }

  verifyRefreshToken(refreshToken: string) {
    return this.jwt.verifyAsync<RequestUser>(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh-secret',
    });
  }

  async logout(userId: string) {
    await this.users
      .updateOne({ id: userId }, { refreshTokenHash: null })
      .exec();
  }

  private async issueTokens(user: User | UserDocument) {
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
    await this.users
      .updateOne(
        { id: userId },
        { refreshTokenHash: await bcrypt.hash(token, 12) },
      )
      .exec();
  }

  private isDuplicateEmailError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000 &&
      'keyPattern' in error &&
      typeof error.keyPattern === 'object' &&
      error.keyPattern !== null &&
      'email' in error.keyPattern
    );
  }

  toProfile(user: User | UserDocument) {
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
