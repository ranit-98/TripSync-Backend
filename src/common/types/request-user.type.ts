import type { UserRole } from '../constants/roles.constants';

export type RequestUser = {
  id: string;
  email: string;
  role: UserRole;
};
