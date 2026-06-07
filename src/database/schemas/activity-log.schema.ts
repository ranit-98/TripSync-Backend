import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { type BaseDocument, publicId, schemaOptions } from './base.schema';

@Schema({
  collection: 'activity_logs',
  timestamps: { createdAt: true, updatedAt: false },
  ...schemaOptions,
})
export class ActivityLog implements BaseDocument {
  @Prop(publicId)
  id: string;

  @Prop({ type: String, default: null, index: true })
  tripId: string | null;

  @Prop({ type: String, default: null })
  actorId: string | null;

  @Prop({ required: true })
  action: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, unknown>;

  createdAt: Date;
}

export type ActivityLogDocument = HydratedDocument<ActivityLog>;
export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);
