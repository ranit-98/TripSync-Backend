import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { type BaseDocument, publicId, schemaOptions } from './base.schema';

@Schema({ collection: 'document_folders', timestamps: true, ...schemaOptions })
export class DocumentFolder implements BaseDocument {
  @Prop(publicId)
  id: string;

  @Prop({ required: true, index: true })
  tripId: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ type: String, default: null, index: true })
  parentId: string | null;

  @Prop({ required: true })
  createdBy: string;

  createdAt: Date;
  updatedAt: Date;
}

@Schema({ collection: 'documents', timestamps: true, ...schemaOptions })
export class Document implements BaseDocument {
  @Prop(publicId)
  id: string;

  @Prop({ required: true, index: true })
  folderId: string;

  @Prop({ required: true, index: true })
  tripId: string;

  @Prop({ required: true })
  displayName: string;

  @Prop({ required: true })
  originalFileName: string;

  @Prop({ required: true })
  objectKey: string;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true, min: 0 })
  size: number;

  @Prop({ required: true })
  uploadedBy: string;

  createdAt: Date;
  updatedAt: Date;
}

export type DocumentFolderDocument = HydratedDocument<DocumentFolder>;
export type DocumentDocument = HydratedDocument<Document>;

export const DocumentFolderSchema =
  SchemaFactory.createForClass(DocumentFolder);
export const DocumentSchema = SchemaFactory.createForClass(Document);
DocumentFolderSchema.index({ tripId: 1, parentId: 1, name: 1 }, { unique: true });
