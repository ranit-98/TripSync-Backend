import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { type BaseDocument, publicId, schemaOptions } from './base.schema';

@Schema({ collection: 'trip_days', timestamps: false, ...schemaOptions })
export class TripDay implements BaseDocument {
  @Prop(publicId)
  id: string;

  @Prop({ required: true, index: true })
  tripId: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ type: String, default: null })
  title: string | null;

  @Prop({ default: 0 })
  position: number;
}

@Schema({ collection: 'activities', timestamps: true, ...schemaOptions })
export class Activity implements BaseDocument {
  @Prop(publicId)
  id: string;

  @Prop({ required: true, index: true })
  tripId: string;

  @Prop({ type: String, default: null, index: true })
  dayId: string | null;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ type: String, default: null })
  location: string | null;

  @Prop({ type: String, default: null })
  startTime: string | null;

  @Prop({ type: String, default: null })
  endTime: string | null;

  @Prop({ default: 0 })
  position: number;

  createdAt: Date;
  updatedAt: Date;
}

export type TripDayDocument = HydratedDocument<TripDay>;
export type ActivityDocument = HydratedDocument<Activity>;

export const TripDaySchema = SchemaFactory.createForClass(TripDay);
export const ActivitySchema = SchemaFactory.createForClass(Activity);

TripDaySchema.index({ tripId: 1, position: 1 });
ActivitySchema.index({ tripId: 1, dayId: 1, position: 1 });
