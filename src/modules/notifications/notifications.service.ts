import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MESSAGES } from '../../common/constants/messages.constants';
import { Notification } from '../../database/schemas';
import { NotificationsGateway } from './notifications.gateway';
import { PaginationQueryDto, paginationMeta } from '../../common/dto/pagination-query.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notifications: Model<Notification>,
    private readonly gateway: NotificationsGateway,
  ) {}

  async createForUser(
    userId: string,
    notification: Pick<Notification, 'body' | 'resourceId' | 'resourceType' | 'title' | 'tripId' | 'type'>,
  ) {
    const created = await this.notifications.create({ userId, ...notification });
    const value = created.toObject() as Notification;

    this.gateway.emitCreated(userId, value);
    return value;
  }

  async list(userId: string, query: PaginationQueryDto) {
    const [items, total] = await Promise.all([
      this.notifications.find({ userId }).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean().exec(),
      this.notifications.countDocuments({ userId }).exec(),
    ]);
    return { items, pagination: paginationMeta(query, total) };
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

  async deleteForResource(userId: string, resourceType: string, resourceId: string) {
    const result = await this.notifications
      .deleteMany({ userId, resourceType, resourceId })
      .exec();

    if (result.deletedCount) this.gateway.emitRemoved(userId, resourceId);
  }
}
