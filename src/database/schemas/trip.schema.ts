import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  INVITE_STATUSES,
  TRIP_MEMBER_ROLES,
  type TripMemberRole,
} from '../../common/constants/roles.constants';
import { type BaseDocument, publicId, schemaOptions } from './base.schema';

@Schema({ collection: 'trips', timestamps: true, ...schemaOptions })
export class Trip implements BaseDocument {
  @Prop(publicId)
  id: string;

  @Prop({ required: true, index: true })
  ownerId: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  destination: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ default: 'USD', uppercase: true, trim: true })
  currency: string;

  @Prop({ default: 0, min: 0 })
  budget: number;

  @Prop({ type: String, default: null })
  coverUrl: string | null;

  @Prop({ type: [String], default: [] })
  styles: string[];

  @Prop({
    type: String,
    enum: ['active', 'archived'],
    default: 'active',
    index: true,
  })
  status: 'active' | 'archived';

  createdAt: Date;
  updatedAt: Date;
}

@Schema({
  collection: 'trip_members',
  timestamps: { createdAt: 'joinedAt', updatedAt: false },
  ...schemaOptions,
})
export class TripMember implements BaseDocument {
  @Prop(publicId)
  id: string;

  @Prop({ required: true, index: true })
  tripId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({
    type: String,
    enum: Object.values(TRIP_MEMBER_ROLES),
    required: true,
  })
  role: TripMemberRole;

  joinedAt: Date;
}

@Schema({ collection: 'trip_invites', timestamps: true, ...schemaOptions })
export class TripInvite implements BaseDocument {
  @Prop(publicId)
  id: string;

  @Prop({ required: true, index: true })
  tripId: string;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({
    type: String,
    enum: Object.values(TRIP_MEMBER_ROLES),
    required: true,
  })
  role: TripMemberRole;

  @Prop({
    type: String,
    enum: Object.values(INVITE_STATUSES),
    default: INVITE_STATUSES.PENDING,
  })
  status: string;

  @Prop({ required: true })
  invitedBy: string;

  @Prop({ type: String, default: null })
  notes: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export type TripDocument = HydratedDocument<Trip>;
export type TripMemberDocument = HydratedDocument<TripMember>;
export type TripInviteDocument = HydratedDocument<TripInvite>;

export const TripSchema = SchemaFactory.createForClass(Trip);
export const TripMemberSchema = SchemaFactory.createForClass(TripMember);
export const TripInviteSchema = SchemaFactory.createForClass(TripInvite);

// One user should have exactly one role per trip.
TripMemberSchema.index({ tripId: 1, userId: 1 }, { unique: true });
