import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { RequestUser } from '../../common/types/request-user.type';

type JwtPayload = RequestUser;

const cookieExtractor = (request: Request): string | null => {
  const cookieName = process.env.ACCESS_TOKEN_COOKIE ?? 'trip_sync_access';
  return (request.cookies?.[cookieName] as string | undefined) ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.accessSecret'),
    });
  }

  validate(payload: JwtPayload): RequestUser {
    return payload;
  }
}
