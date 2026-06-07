import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { type BaseDocument, publicId, schemaOptions } from './base.schema';

@Schema({ collection: 'photos', timestamps: true, ...schemaOptions })
export class Photo implements BaseDocument {
  @Prop(publicId)
  id: string;

  @Prop({ required: true, index: true })
  tripId: string;

  @Prop({ type: String, default: null })
  caption: string | null;

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

  @Prop({ required: true })
  uploadedBy: string;

  createdAt: Date;
  updatedAt: Date;
}

export type PhotoDocument = HydratedDocument<Photo>;
export const PhotoSchema = SchemaFactory.createForClass(Photo);
