import { SetMetadata } from '@nestjs/common';
import type { TripMemberRole } from '../constants/roles.constants';

export const TRIP_ROLES_KEY = 'trip_roles';
export const TripRoles = (...roles: TripMemberRole[]) =>
  SetMetadata(TRIP_ROLES_KEY, roles);
