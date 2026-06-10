import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Message, MessageAttachment, User } from '../../database/schemas';

type ChatMessagePayload = Message & {
  attachments: MessageAttachment[];
  sender: User | null;
};

type TypingPayload = {
  isTyping: boolean;
  tripId: string;
  user?: {
    avatarUrl?: string | null;
    id: string;
    name: string;
  };
};

const roomName = (tripId: string) => `trip:${tripId}:chat`;

@WebSocketGateway({
  cors: {
    credentials: true,
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  },
})
export class ChatGateway {
  @WebSocketServer()
  private server: Server;

  @SubscribeMessage('chat:join')
  joinTrip(
    @MessageBody() payload: { tripId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!payload.tripId) return;

    void client.join(roomName(payload.tripId));
  }

  @SubscribeMessage('chat:leave')
  leaveTrip(
    @MessageBody() payload: { tripId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!payload.tripId) return;

    void client.leave(roomName(payload.tripId));
  }

  @SubscribeMessage('chat:typing')
  typing(@MessageBody() payload: TypingPayload, @ConnectedSocket() client: Socket) {
    if (!payload.tripId || !payload.user?.id) return;

    client.to(roomName(payload.tripId)).emit('chat:typing', payload);
  }

  emitMessageCreated(tripId: string, message: ChatMessagePayload) {
    this.server.to(roomName(tripId)).emit('chat:message-created', message);
  }

  emitMessageDeleted(tripId: string, messageId: string) {
    this.server.to(roomName(tripId)).emit('chat:message-deleted', { messageId });
  }
}
