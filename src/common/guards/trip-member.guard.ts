import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TripMember } from '../../database/schemas';
import { MESSAGES } from '../constants/messages.constants';
import { USER_ROLES, type TripMemberRole } from '../constants/roles.constants';
import { TRIP_ROLES_KEY } from '../decorators/trip-roles.decorator';
import { RequestUser } from '../types/request-user.type';

type RequestTripMember = {
  id: string;
  tripId: string;
  userId: string;
  role: TripMemberRole;
};

@Injectable()
export class TripMemberGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectModel(TripMember.name)
    private readonly tripMembers: Model<TripMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      params: Record<string, string>;
      user: RequestUser;
      tripMember?: RequestTripMember;
    }>();
    const tripId = request.params.tripId;
    const user = request.user;

    if (!tripId) {
      return true;
    }

    if (user.role === USER_ROLES.ADMIN) {
      return true;
    }

    const membership = await this.tripMembers
      .findOne({ tripId, userId: user.id })
      .lean()
      .exec();

    if (!membership) {
      throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    }

    request.tripMember = membership;
    const requiredRoles =
      this.reflector.getAllAndOverride<TripMemberRole[]>(TRIP_ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredRoles.length > 0 && !requiredRoles.includes(membership.role)) {
      throw new ForbiddenException(MESSAGES.COMMON.FORBIDDEN);
    }

    return true;
  }
}
