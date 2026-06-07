import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MESSAGES } from '../../common/constants/messages.constants';
import { Notification } from '../../database/schemas';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notifications: Model<Notification>,
  ) {}

  list(userId: string) {
    return this.notifications
      .find({ userId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
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
}
