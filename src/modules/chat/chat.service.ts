import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { MESSAGES } from '../../common/constants/messages.constants';
import {
  USER_ROLES,
  type UserRole,
} from '../../common/constants/roles.constants';
import { Message, MessageAttachment, User } from '../../database/schemas';
import { CreateAttachmentDto, CreateMessageDto } from './dto/chat.dto';

type MessageReadModel = Message & {
  sender: User | null;
  attachments: MessageAttachment[];
};

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message.name) private readonly messages: Model<Message>,
    @InjectModel(MessageAttachment.name)
    private readonly attachments: Model<MessageAttachment>,
  ) {}

  async history(tripId: string) {
    return this.messages
      .aggregate<MessageReadModel>([
        { $match: { tripId } },
        { $sort: { createdAt: 1 } },
        {
          $lookup: {
            from: 'users',
            localField: 'senderId',
            foreignField: 'id',
            pipeline: [this.publicUserProject()],
            as: 'sender',
          },
        },
        { $unwind: { path: '$sender', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'message_attachments',
            localField: 'id',
            foreignField: 'messageId',
            pipeline: [{ $project: { _id: 0 } }],
            as: 'attachments',
          },
        },
        { $project: { _id: 0 } },
      ])
      .exec();
  }

  send(tripId: string, senderId: string, dto: CreateMessageDto) {
    return this.messages.create({ tripId, senderId, body: dto.body });
  }

  async attach(messageId: string, dto: CreateAttachmentDto) {
    const message = await this.messages.exists({ id: messageId }).exec();
    if (!message) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    return this.attachments.create({ ...dto, messageId });
  }

  async delete(messageId: string, userId: string, role: UserRole) {
    const message = await this.messages.findOne({ id: messageId }).exec();
    if (!message) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    if (message.senderId !== userId && role !== USER_ROLES.ADMIN) {
      throw new ForbiddenException(MESSAGES.COMMON.FORBIDDEN);
    }
    await this.messages.deleteOne({ id: messageId }).exec();
    await this.attachments.deleteMany({ messageId }).exec();
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
