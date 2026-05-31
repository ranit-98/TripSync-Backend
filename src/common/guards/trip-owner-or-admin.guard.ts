import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MESSAGES } from '../constants/messages.constants';
import { USER_ROLES } from '../constants/roles.constants';
import { RequestUser } from '../types/request-user.type';

@Injectable()
export class TripOwnerOrAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      params: Record<string, string>;
      user: RequestUser;
    }>();
    const trip = await this.prisma.trip.findUnique({
      where: { id: request.params.tripId },
    });

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
