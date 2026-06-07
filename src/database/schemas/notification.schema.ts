import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { type BaseDocument, publicId, schemaOptions } from './base.schema';

@Schema({
  collection: 'notifications',
  timestamps: { createdAt: true, updatedAt: false },
  ...schemaOptions,
})
export class Notification implements BaseDocument {
  @Prop(publicId)
  id: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ type: String, default: null, index: true })
  tripId: string | null;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop({ type: String, default: null })
  body: string | null;

  @Prop({ type: String, default: null })
  resourceType: string | null;

  @Prop({ type: String, default: null })
  resourceId: string | null;

  @Prop({ type: Date, default: null })
  readAt: Date | null;

  createdAt: Date;
}

export type NotificationDocument = HydratedDocument<Notification>;
export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ userId: 1, createdAt: -1 });
