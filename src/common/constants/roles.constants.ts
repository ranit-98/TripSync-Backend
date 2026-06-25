export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const TRIP_MEMBER_ROLES = {
  COLLABORATOR: 'collaborator',
  VIEWER: 'viewer',
} as const;

export type TripMemberRole =
  (typeof TRIP_MEMBER_ROLES)[keyof typeof TRIP_MEMBER_ROLES];

export const INVITE_STATUSES = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  EXPIRED: 'expired',
} as const;

export const SETTLEMENT_STATUSES = {
  PENDING: 'pending',
  PAYMENT_DECLARED: 'payment_declared',
  PAID: 'paid',
} as const;
