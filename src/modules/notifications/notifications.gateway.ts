import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Notification } from '../../database/schemas';

const userRoom = (userId: string) => `user:${userId}:notifications`;

@WebSocketGateway({
  cors: {
    credentials: true,
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  },
})
export class NotificationsGateway {
  @WebSocketServer()
  private server!: Server;

  @SubscribeMessage('notifications:join')
  join(@MessageBody() payload: { userId?: string }, @ConnectedSocket() client: Socket) {
    if (payload.userId) void client.join(userRoom(payload.userId));
  }

  @SubscribeMessage('notifications:leave')
  leave(@MessageBody() payload: { userId?: string }, @ConnectedSocket() client: Socket) {
    if (payload.userId) void client.leave(userRoom(payload.userId));
  }

  emitCreated(userId: string, notification: Notification) {
    this.server.to(userRoom(userId)).emit('notification:created', notification);
  }

  emitRemoved(userId: string, resourceId: string) {
    this.server.to(userRoom(userId)).emit('notification:removed', { resourceId });
  }
}
