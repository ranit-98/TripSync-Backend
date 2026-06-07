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
  TRIP_MEMBER_ROLES,
} from '../../common/constants/roles.constants';
import { Trip, TripInvite, TripMember, User } from '../../database/schemas';
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
type LookupPipelineStage = Exclude<
  PipelineStage,
  PipelineStage.Merge | PipelineStage.Out
>;

@Injectable()
export class TripsService {
  constructor(
    @InjectModel(Trip.name) private readonly trips: Model<Trip>,
    @InjectModel(TripMember.name)
    private readonly tripMembers: Model<TripMember>,
    @InjectModel(TripInvite.name)
    private readonly tripInvites: Model<TripInvite>,
    @InjectModel(User.name) private readonly users: Model<User>,
  ) {}

  async listForUser(userId: string) {
    return this.trips
      .aggregate<Trip>([
        { $match: { status: 'active' } },
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
        { $sort: { startDate: 1 } },
        { $project: { _id: 0, requesterMembership: 0 } },
      ])
      .exec();
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
      coverUrl: dto.coverUrl ?? null,
      styles: dto.styles ?? [],
    });

    // Keep permissions in their own collection so membership checks stay cheap.
    await this.tripMembers.create({
      tripId: trip.id,
      userId: ownerId,
      role: TRIP_MEMBER_ROLES.COLLABORATOR,
    });

    if (dto.inviteEmail) {
      await this.tripInvites.create({
        tripId: trip.id,
        email: dto.inviteEmail.toLowerCase(),
        role: dto.inviteRole ?? TRIP_MEMBER_ROLES.VIEWER,
        invitedBy: ownerId,
        notes: dto.inviteNotes ?? null,
      });
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

  listMembers(tripId: string) {
    return this.tripMembers
      .aggregate<TripMemberWithUser>(this.membersWithUsersPipeline(tripId))
      .exec();
  }

  invite(tripId: string, invitedBy: string, dto: InviteMemberDto) {
    return this.tripInvites.create({
      tripId,
      email: dto.email.toLowerCase(),
      role: dto.role,
      invitedBy,
      notes: dto.notes ?? null,
    });
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

  async acceptInvite(inviteId: string, userId: string, userEmail: string) {
    const invite = await this.tripInvites.findOne({ id: inviteId }).exec();
    if (!invite || invite.email !== userEmail.toLowerCase()) {
      throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    }
    if (invite.status !== INVITE_STATUSES.PENDING) {
      throw new BadRequestException('Invite is no longer pending');
    }

    await this.tripMembers.updateOne(
      { tripId: invite.tripId, userId },
      { $setOnInsert: { tripId: invite.tripId, userId, role: invite.role } },
      { upsert: true },
    );
    await this.tripInvites
      .updateOne({ id: invite.id }, { status: INVITE_STATUSES.ACCEPTED })
      .exec();
  }

  async declineInvite(inviteId: string, userEmail: string) {
    const invite = await this.tripInvites.findOne({ id: inviteId }).exec();
    if (!invite || invite.email !== userEmail.toLowerCase()) {
      throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    }
    await this.tripInvites
      .updateOne({ id: invite.id }, { status: INVITE_STATUSES.DECLINED })
      .exec();
  }

  private tripDetailsPipeline(tripId: string): PipelineStage[] {
    return [
      { $match: { id: tripId } },
      { $limit: 1 },
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
