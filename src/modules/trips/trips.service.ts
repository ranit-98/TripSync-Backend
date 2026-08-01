import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { MESSAGES } from '../../common/constants/messages.constants';
import {
  INVITE_STATUSES,
  SETTLEMENT_STATUSES,
  TRIP_MEMBER_ROLES,
} from '../../common/constants/roles.constants';
import {
  Settlement,
  Trip,
  TripInvite,
  TripMember,
  User,
} from '../../database/schemas';
import { NotificationsService } from '../notifications/notifications.service';
import {
  PaginationQueryDto,
  SearchPaginationQueryDto,
  paginationMeta,
} from '../../common/dto/pagination-query.dto';
import {
  CreateTripDto,
  InviteMemberDto,
  UpdateMemberDto,
  UpdateTripDto,
} from './dto/trip.dto';

type TripMemberWithUser = TripMember & { user: User | null };
type TripDetails = Trip & {
  owner: User | null;
  members: TripMemberWithUser[];
  invites: TripInvite[];
};
type TripInviteWithTrip = TripInvite & { trip: Trip | null };
type LookupPipelineStage = Exclude<
  PipelineStage,
  PipelineStage.Merge | PipelineStage.Out
>;

const DEFAULT_TRIP_COVER_URL =
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=80';

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  );
}

@Injectable()
export class TripsService {
  constructor(
    @InjectModel(Trip.name) private readonly trips: Model<Trip>,
    @InjectModel(TripMember.name)
    private readonly tripMembers: Model<TripMember>,
    @InjectModel(TripInvite.name)
    private readonly tripInvites: Model<TripInvite>,
    @InjectModel(Settlement.name)
    private readonly settlements: Model<Settlement>,
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly notifications: NotificationsService,
  ) {}

  async listForUser(userId: string, query: SearchPaginationQueryDto) {
    const search = query.search?.trim();
    const pipeline: PipelineStage[] = [
      { $match: { status: 'active' } },
      ...(search
        ? [
            {
              $match: {
                $or: [
                  {
                    title: {
                      $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                      $options: 'i',
                    },
                  },
                  {
                    destination: {
                      $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                      $options: 'i',
                    },
                  },
                ],
              },
            } as PipelineStage,
          ]
        : []),
      {
        $lookup: {
          from: 'trip_members',
          let: { tripId: '$id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$tripId', '$$tripId'] },
                    { $eq: ['$userId', userId] },
                  ],
                },
              },
            },
            { $project: { _id: 0, id: 1 } },
          ],
          as: 'requesterMembership',
        },
      },
      {
        $match: {
          $or: [{ ownerId: userId }, { requesterMembership: { $ne: [] } }],
        },
      },
      this.defaultCoverStage(),
      { $sort: { startDate: 1 } },
      { $project: { _id: 0, requesterMembership: 0 } },
    ];
    const [items, total] = await Promise.all([
      this.trips
        .aggregate<Trip>([
          ...pipeline,
          { $skip: (query.page - 1) * query.limit },
          { $limit: query.limit },
        ])
        .exec(),
      this.trips
        .aggregate<{ total: number }>([...pipeline, { $count: 'total' }])
        .exec(),
    ]);
    return { items, pagination: paginationMeta(query, total[0]?.total ?? 0) };
  }

  async create(ownerId: string, dto: CreateTripDto) {
    const trip = await this.trips.create({
      ownerId,
      title: dto.title,
      destination: dto.destination,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      currency: dto.currency ?? 'USD',
      budget: dto.budget ?? 0,
      coverUrl: dto.coverUrl ?? DEFAULT_TRIP_COVER_URL,
      styles: dto.styles ?? [],
    });

    // Keep permissions in their own collection so membership checks stay cheap.
    await this.tripMembers.create({
      tripId: trip.id,
      userId: ownerId,
      role: TRIP_MEMBER_ROLES.COLLABORATOR,
    });

    if (dto.inviteEmail) {
      const invite = await this.tripInvites.create({
        tripId: trip.id,
        email: dto.inviteEmail.toLowerCase(),
        role: dto.inviteRole ?? TRIP_MEMBER_ROLES.VIEWER,
        invitedBy: ownerId,
        notes: dto.inviteNotes ?? null,
      });
      await this.createInviteNotification(invite, trip);
    }

    return trip;
  }

  async findById(tripId: string) {
    const [trip] = await this.trips
      .aggregate<TripDetails>(this.tripDetailsPipeline(tripId))
      .exec();

    if (!trip) {
      throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    }
    return trip;
  }

  async update(tripId: string, dto: UpdateTripDto) {
    const update = {
      ...dto,
      startDate:
        dto.startDate === undefined ? undefined : new Date(dto.startDate),
      endDate: dto.endDate === undefined ? undefined : new Date(dto.endDate),
    };

    await this.trips.updateOne({ id: tripId }, update).exec();
    return this.findById(tripId);
  }

  async archive(tripId: string) {
    await this.trips.updateOne({ id: tripId }, { status: 'archived' }).exec();
  }

  async listMembers(tripId: string, query: PaginationQueryDto) {
    const pipeline = this.membersWithUsersPipeline(tripId);
    const [items, total] = await Promise.all([
      this.tripMembers
        .aggregate<TripMemberWithUser>([
          ...pipeline,
          { $skip: (query.page - 1) * query.limit },
          { $limit: query.limit },
        ])
        .exec(),
      this.tripMembers
        .aggregate<{ total: number }>([...pipeline, { $count: 'total' }])
        .exec(),
    ]);
    return { items, pagination: paginationMeta(query, total[0]?.total ?? 0) };
  }

  async invite(tripId: string, invitedBy: string, dto: InviteMemberDto) {
    const invite = await this.tripInvites.create({
      tripId,
      email: dto.email.toLowerCase(),
      role: dto.role,
      invitedBy,
      notes: dto.notes ?? null,
    });
    const trip = await this.trips.findOne({ id: tripId }).lean().exec();
    await this.createInviteNotification(invite, trip);

    return invite;
  }

  async listPendingInvites(userEmail: string, query: PaginationQueryDto) {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          email: userEmail.toLowerCase(),
          status: INVITE_STATUSES.PENDING,
        },
      },
      {
        $lookup: {
          from: 'trips',
          localField: 'tripId',
          foreignField: 'id',
          pipeline: [
            { $match: { status: 'active' } },
            {
              $project: {
                _id: 0,
                id: 1,
                title: 1,
                destination: 1,
                startDate: 1,
                endDate: 1,
                currency: 1,
                budget: 1,
                coverUrl: 1,
                styles: 1,
                createdAt: 1,
                updatedAt: 1,
              },
            },
          ],
          as: 'trip',
        },
      },
      { $unwind: { path: '$trip', preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } },
      { $project: { _id: 0 } },
    ];
    const [items, total] = await Promise.all([
      this.tripInvites
        .aggregate<TripInviteWithTrip>([
          ...pipeline,
          { $skip: (query.page - 1) * query.limit },
          { $limit: query.limit },
        ])
        .exec(),
      this.tripInvites
        .countDocuments({
          email: userEmail.toLowerCase(),
          status: INVITE_STATUSES.PENDING,
        })
        .exec(),
    ]);
    return { items, pagination: paginationMeta(query, total) };
  }

  async updateMember(memberId: string, dto: UpdateMemberDto) {
    const member = await this.tripMembers
      .findOneAndUpdate({ id: memberId }, { role: dto.role }, { new: true })
      .lean()
      .exec();
    if (!member) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);

    const user = await this.users.findOne({ id: member.userId }).lean().exec();
    return { ...member, user };
  }

  async removeMember(memberId: string) {
    await this.tripMembers.deleteOne({ id: memberId }).exec();
  }

  async leaveTrip(tripId: string, userId: string) {
    const trip = await this.trips.findOne({ id: tripId }).lean().exec();
    if (!trip) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);

    if (trip.ownerId === userId) {
      throw new BadRequestException(
        'Trip owner cannot leave the trip. Delete the trip instead.',
      );
    }

    const member = await this.tripMembers
      .findOne({ tripId, userId })
      .lean()
      .exec();
    if (!member) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);

    const hasPendingSettlement = await this.settlements
      .exists({
        tripId,
        status: { $ne: SETTLEMENT_STATUSES.PAID },
        amount: { $gt: 0.005 },
        $or: [{ fromUserId: userId }, { toUserId: userId }],
      })
      .exec();

    if (hasPendingSettlement) {
      throw new BadRequestException(
        'Settle all pending payments before leaving this trip.',
      );
    }

    await this.tripMembers.deleteOne({ id: member.id }).exec();
  }

  async acceptInvite(inviteId: string, userId: string, userEmail: string) {
    const invite = await this.tripInvites.findOne({ id: inviteId }).exec();
    if (!invite || invite.email !== userEmail.toLowerCase()) {
      throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    }
    if (invite.status !== INVITE_STATUSES.PENDING) {
      throw new BadRequestException('Invite is no longer pending');
    }

    const existingMember = await this.tripMembers
      .exists({ tripId: invite.tripId, userId })
      .exec();

    if (!existingMember) {
      try {
        await this.tripMembers.create({
          tripId: invite.tripId,
          userId,
          role: invite.role,
        });
      } catch (error) {
        if (!isDuplicateKeyError(error)) {
          throw error;
        }
      }
    }

    await this.tripInvites
      .updateOne({ id: invite.id }, { status: INVITE_STATUSES.ACCEPTED })
      .exec();
    await this.notifications.deleteForResource(userId, 'trip_invite', inviteId);
    await this.notifyTripMembers(
      invite.tripId,
      userId,
      'trip_member_joined',
      `${(await this.users.findOne({ id: userId }).lean().exec())?.name ?? userEmail} joined the trip.`,
    );
  }

  async declineInvite(inviteId: string, userEmail: string) {
    const invite = await this.tripInvites.findOne({ id: inviteId }).exec();
    if (!invite || invite.email !== userEmail.toLowerCase()) {
      throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    }
    await this.tripInvites
      .updateOne({ id: invite.id }, { status: INVITE_STATUSES.DECLINED })
      .exec();
    const invitee = await this.users
      .findOne({ email: invite.email })
      .lean()
      .exec();
    if (invitee) {
      await this.notifications.deleteForResource(
        invitee.id,
        'trip_invite',
        inviteId,
      );
    }
    await this.notifyTripMembers(
      invite.tripId,
      invitee?.id,
      'trip_invite_declined',
      `${invitee?.name ?? invite.email} declined the trip invitation.`,
    );
  }

  private async createInviteNotification(
    invite: TripInvite,
    trip: Trip | null,
  ) {
    const invitee = await this.users
      .findOne({ email: invite.email })
      .lean()
      .exec();
    if (!invitee) return;

    await this.notifications.createForUser(invitee.id, {
      body: invite.notes ?? `You have been invited as a ${invite.role}.`,
      resourceId: invite.id,
      resourceType: 'trip_invite',
      title: trip?.title ?? 'New trip invite',
      tripId: invite.tripId,
      type: 'trip_invite',
    });
  }

  private async notifyTripMembers(
    tripId: string,
    actorId: string | undefined,
    type: 'trip_invite_declined' | 'trip_member_joined',
    body: string,
  ) {
    const [trip, members] = await Promise.all([
      this.trips.findOne({ id: tripId }).lean().exec(),
      this.tripMembers.find({ tripId }).lean().exec(),
    ]);
    const recipientIds = [
      ...new Set(
        members
          .map((member) => member.userId)
          .filter((userId) => userId !== actorId),
      ),
    ];

    await Promise.all(
      recipientIds.map((userId) =>
        this.notifications.createForUser(userId, {
          body,
          resourceId: tripId,
          resourceType: 'trip',
          title: trip?.title ?? 'Trip activity',
          tripId,
          type,
        }),
      ),
    );
  }

  private tripDetailsPipeline(tripId: string): PipelineStage[] {
    return [
      { $match: { id: tripId } },
      { $limit: 1 },
      this.defaultCoverStage(),
      {
        $lookup: {
          from: 'users',
          localField: 'ownerId',
          foreignField: 'id',
          pipeline: [this.publicUserProject()],
          as: 'owner',
        },
      },
      { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'trip_members',
          let: { tripId: '$id' },
          pipeline: this.membersWithUsersPipeline(),
          as: 'members',
        },
      },
      {
        $lookup: {
          from: 'trip_invites',
          let: { tripId: '$id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$tripId', '$$tripId'] } } },
            { $sort: { createdAt: -1 } },
            { $project: { _id: 0 } },
          ],
          as: 'invites',
        },
      },
      { $project: { _id: 0 } },
    ];
  }

  private defaultCoverStage(): PipelineStage.AddFields {
    return {
      $addFields: {
        coverUrl: {
          $ifNull: ['$coverUrl', DEFAULT_TRIP_COVER_URL],
        },
      },
    };
  }

  private membersWithUsersPipeline(tripId?: string): LookupPipelineStage[] {
    const matchStage: LookupPipelineStage =
      tripId === undefined
        ? { $match: { $expr: { $eq: ['$tripId', '$$tripId'] } } }
        : { $match: { tripId } };

    return [
      matchStage,
      { $sort: { joinedAt: 1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: 'id',
          pipeline: [this.publicUserProject()],
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0 } },
    ];
  }

  private publicUserProject(): PipelineStage.Project {
    return {
      $project: {
        _id: 0,
        id: 1,
        name: 1,
        email: 1,
        avatarUrl: 1,
        role: 1,
        createdAt: 1,
      },
    };
  }
}
