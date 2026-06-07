import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { type BaseDocument, publicId, schemaOptions } from './base.schema';

@Schema({ collection: 'locations', timestamps: false, ...schemaOptions })
export class Location implements BaseDocument {
  @Prop(publicId)
  id: string;

  @Prop({ required: true, index: true })
  tripId: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: String, default: null })
  address: string | null;

  @Prop({ type: Number, default: null })
  latitude: number | null;

  @Prop({ type: Number, default: null })
  longitude: number | null;

  @Prop({ default: 0 })
  position: number;
}

export type LocationDocument = HydratedDocument<Location>;
export const LocationSchema = SchemaFactory.createForClass(Location);

LocationSchema.index({ tripId: 1, position: 1 });
