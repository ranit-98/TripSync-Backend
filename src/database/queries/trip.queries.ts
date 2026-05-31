import type { Prisma } from '@prisma/client';

export function tripWithMembers(): Prisma.TripInclude {
  return {
    members: {
      include: {
        user: true,
      },
      orderBy: {
        joinedAt: 'asc',
      },
    },
    owner: true,
  };
}

export function activeTripsForUserWhere(userId: string): Prisma.TripWhereInput {
  return {
    status: 'active',
    members: {
      some: {
        userId,
      },
    },
  };
}

export function tripStartDateAscending(): Prisma.TripOrderByWithRelationInput {
  return {
    startDate: 'asc',
  };
}
