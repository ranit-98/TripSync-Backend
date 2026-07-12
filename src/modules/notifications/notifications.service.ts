import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MESSAGES } from '../../common/constants/messages.constants';
import { Notification } from '../../database/schemas';
import { NotificationsGateway } from './notifications.gateway';
import {
  NotificationListQueryDto,
  paginationMeta,
} from '../../common/dto/pagination-query.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notifications: Model<Notification>,
    private readonly gateway: NotificationsGateway,
  ) {}

  async createForUser(
    userId: string,
    notification: Pick<
      Notification,
      'body' | 'resourceId' | 'resourceType' | 'title' | 'tripId' | 'type'
    >,
  ) {
    const created = await this.notifications.create({
      userId,
      ...notification,
    });
    const value = created.toObject() as Notification;

    this.gateway.emitCreated(userId, value);
    return value;
  }

  async list(userId: string, query: NotificationListQueryDto) {
    const search = query.search?.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const categoryTerms = {
      invite: 'invite',
      expense: 'expense|budget|settlement',
      itinerary: 'itinerary|activity|schedule',
    } as const;
    const searchableFields = ['type', 'resourceType', 'title', 'body'];
    const textMatch = (pattern: string) => ({
      $or: searchableFields.map((field) => ({
        [field]: { $regex: pattern, $options: 'i' },
      })),
    });
    const categoryMatches = {
      invite: textMatch(categoryTerms.invite),
      expense: {
        $and: [
          { $nor: [textMatch(categoryTerms.invite)] },
          textMatch(categoryTerms.expense),
        ],
      },
      itinerary: {
        $and: [
          {
            $nor: [
              textMatch(categoryTerms.invite),
              textMatch(categoryTerms.expense),
            ],
          },
          textMatch(categoryTerms.itinerary),
        ],
      },
    };
    const filter: Record<string, unknown> = { userId };
    const clauses: Record<string, unknown>[] = [];

    if (search) clauses.push(textMatch(search));
    if (query.category !== 'all') clauses.push(categoryMatches[query.category]);
    if (clauses.length) filter.$and = clauses;

    const searchClauses = search ? [textMatch(search)] : [];
    const searchFilter = {
      userId,
      ...(searchClauses.length ? { $and: searchClauses } : {}),
    };
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const [items, total, all, invite, expense, itinerary, unread, today] =
      await Promise.all([
        this.notifications
          .find(filter)
          .sort({ createdAt: -1 })
          .skip((query.page - 1) * query.limit)
          .limit(query.limit)
          .lean()
          .exec(),
        this.notifications.countDocuments(filter).exec(),
        this.notifications.countDocuments(searchFilter).exec(),
        this.notifications
          .countDocuments({
            ...searchFilter,
            $and: [...searchClauses, categoryMatches.invite],
          })
          .exec(),
        this.notifications
          .countDocuments({
            ...searchFilter,
            $and: [...searchClauses, categoryMatches.expense],
          })
          .exec(),
        this.notifications
          .countDocuments({
            ...searchFilter,
            $and: [...searchClauses, categoryMatches.itinerary],
          })
          .exec(),
        this.notifications
          .countDocuments({ ...searchFilter, readAt: null })
          .exec(),
        this.notifications
          .countDocuments({
            ...searchFilter,
            createdAt: { $gte: startOfToday },
          })
          .exec(),
      ]);
    return {
      items,
      pagination: paginationMeta(query, total),
      counts: { all, invite, expense, itinerary, unread, today },
    };
  }

  async markRead(userId: string, notificationId: string) {
    const notification = await this.notifications
      .findOneAndUpdate(
        { id: notificationId, userId },
        { readAt: new Date() },
        { new: true },
      )
      .exec();
    if (!notification) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    return notification;
  }

  async markAllRead(userId: string) {
    await this.notifications
      .updateMany({ userId }, { readAt: new Date() })
      .exec();
  }

  async delete(userId: string, notificationId: string) {
    await this.notifications.deleteOne({ id: notificationId, userId }).exec();
  }

  async deleteForResource(
    userId: string,
    resourceType: string,
    resourceId: string,
  ) {
    const result = await this.notifications
      .deleteMany({ userId, resourceType, resourceId })
      .exec();

    if (result.deletedCount) this.gateway.emitRemoved(userId, resourceId);
  }
}
