import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MESSAGES } from '../../common/constants/messages.constants';
import {
  INVITE_STATUSES,
  TRIP_MEMBER_ROLES,
} from '../../common/constants/roles.constants';
import {
  activeTripsForUserWhere,
  tripWithMembers,
  tripStartDateAscending,
} from '../../database/queries/trip.queries';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateTripDto,
  InviteMemberDto,
  UpdateMemberDto,
  UpdateTripDto,
} from './dto/trip.dto';

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(userId: string) {
    return this.prisma.trip.findMany({
      where: activeTripsForUserWhere(userId),
      orderBy: tripStartDateAscending(),
    });
  }

  async create(ownerId: string, dto: CreateTripDto) {
    return this.prisma.$transaction(async (tx) => {
      const trip = await tx.trip.create({
        data: {
          ownerId,
          title: dto.title,
          destination: dto.destination,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          currency: dto.currency ?? 'USD',
          budget: dto.budget ?? 0,
          coverUrl: dto.coverUrl,
          styles: dto.styles ?? [],
        },
      });

      await tx.tripMember.create({
        data: {
          tripId: trip.id,
          userId: ownerId,
          role: TRIP_MEMBER_ROLES.COLLABORATOR,
        },
      });

      if (dto.inviteEmail) {
        await tx.tripInvite.create({
          data: {
            tripId: trip.id,
            email: dto.inviteEmail.toLowerCase(),
            role: dto.inviteRole ?? TRIP_MEMBER_ROLES.VIEWER,
            invitedBy: ownerId,
            notes: dto.inviteNotes,
          },
        });
      }

      return trip;
    });
  }

  async findById(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: tripWithMembers(),
    });
    if (!trip) {
      throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    }
    return trip;
  }

  async update(tripId: string, dto: UpdateTripDto) {
    await this.prisma.trip.update({
      where: { id: tripId },
      data: {
        ...dto,
        startDate:
          dto.startDate === undefined ? undefined : new Date(dto.startDate),
        endDate: dto.endDate === undefined ? undefined : new Date(dto.endDate),
        budget: dto.budget,
      },
    });
    return this.findById(tripId);
  }

  async archive(tripId: string) {
    await this.prisma.trip.update({
      where: { id: tripId },
      data: { status: 'archived' },
    });
  }

  async listMembers(tripId: string) {
    return this.prisma.tripMember.findMany({
      where: { tripId },
      include: { user: true },
      orderBy: { joinedAt: 'asc' },
    });
  }

  invite(tripId: string, invitedBy: string, dto: InviteMemberDto) {
    return this.prisma.tripInvite.create({
      data: {
        tripId,
        email: dto.email.toLowerCase(),
        role: dto.role,
        invitedBy,
        notes: dto.notes,
      },
    });
  }

  async updateMember(memberId: string, dto: UpdateMemberDto) {
    return this.prisma.tripMember.update({
      where: { id: memberId },
      data: { role: dto.role },
      include: { user: true },
    });
  }

  async removeMember(memberId: string) {
    await this.prisma.tripMember.delete({ where: { id: memberId } });
  }

  async acceptInvite(inviteId: string, userId: string, userEmail: string) {
    const invite = await this.prisma.tripInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite || invite.email !== userEmail.toLowerCase()) {
      throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    }
    if (invite.status !== INVITE_STATUSES.PENDING) {
      throw new BadRequestException('Invite is no longer pending');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.tripMember.create({
        data: {
          tripId: invite.tripId,
          userId,
          role: invite.role,
        },
      });
      await tx.tripInvite.update({
        where: { id: invite.id },
        data: { status: INVITE_STATUSES.ACCEPTED },
      });
    });
  }

  async declineInvite(inviteId: string, userEmail: string) {
    const invite = await this.prisma.tripInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite || invite.email !== userEmail.toLowerCase()) {
      throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    }
    await this.prisma.tripInvite.update({
      where: { id: invite.id },
      data: { status: INVITE_STATUSES.DECLINED },
    });
  }
}
