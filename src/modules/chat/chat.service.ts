import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MESSAGES } from '../../common/constants/messages.constants';
import {
  USER_ROLES,
  type UserRole,
} from '../../common/constants/roles.constants';
import { PrismaService } from '../../database/prisma.service';
import { CreateAttachmentDto, CreateMessageDto } from './dto/chat.dto';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  history(tripId: string) {
    return this.prisma.message.findMany({
      where: { tripId },
      include: { sender: true, attachments: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  send(tripId: string, senderId: string, dto: CreateMessageDto) {
    return this.prisma.message.create({
      data: { tripId, senderId, body: dto.body },
    });
  }

  async attach(messageId: string, dto: CreateAttachmentDto) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    return this.prisma.messageAttachment.create({
      data: { ...dto, messageId },
    });
  }

  async delete(messageId: string, userId: string, role: UserRole) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    if (message.senderId !== userId && role !== USER_ROLES.ADMIN) {
      throw new ForbiddenException(MESSAGES.COMMON.FORBIDDEN);
    }
    await this.prisma.message.delete({ where: { id: messageId } });
  }
}
