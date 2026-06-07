import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { type BaseDocument, publicId, schemaOptions } from './base.schema';

@Schema({
  collection: 'messages',
  timestamps: { createdAt: true, updatedAt: false },
  ...schemaOptions,
})
export class Message implements BaseDocument {
  @Prop(publicId)
  id: string;

  @Prop({ required: true, index: true })
  tripId: string;

  @Prop({ required: true, index: true })
  senderId: string;

  @Prop({ required: true })
  body: string;

  createdAt: Date;
}

@Schema({
  collection: 'message_attachments',
  timestamps: false,
  ...schemaOptions,
})
export class MessageAttachment implements BaseDocument {
  @Prop(publicId)
  id: string;

  @Prop({ required: true, index: true })
  messageId: string;

  @Prop({ required: true })
  objectKey: string;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  originalFileName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true, min: 0 })
  size: number;
}

export type MessageDocument = HydratedDocument<Message>;
export type MessageAttachmentDocument = HydratedDocument<MessageAttachment>;

export const MessageSchema = SchemaFactory.createForClass(Message);
export const MessageAttachmentSchema =
  SchemaFactory.createForClass(MessageAttachment);

MessageSchema.index({ tripId: 1, createdAt: 1 });
