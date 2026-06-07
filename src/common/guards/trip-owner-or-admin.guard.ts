import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Trip } from '../../database/schemas';
import { MESSAGES } from '../constants/messages.constants';
import { USER_ROLES } from '../constants/roles.constants';
import { RequestUser } from '../types/request-user.type';

@Injectable()
export class TripOwnerOrAdminGuard implements CanActivate {
  constructor(@InjectModel(Trip.name) private readonly trips: Model<Trip>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      params: Record<string, string>;
      user: RequestUser;
    }>();
    const trip = await this.trips.findOne({ id: request.params.tripId }).exec();

    if (!trip) {
      throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    }

    if (
      request.user.role !== USER_ROLES.ADMIN &&
      trip.ownerId !== request.user.id
    ) {
      throw new ForbiddenException(MESSAGES.COMMON.FORBIDDEN);
    }

    return true;
  }
}
