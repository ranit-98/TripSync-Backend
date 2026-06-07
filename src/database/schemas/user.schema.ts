import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  USER_ROLES,
  type UserRole,
} from '../../common/constants/roles.constants';
import { type BaseDocument, publicId, schemaOptions } from './base.schema';

@Schema({ collection: 'users', timestamps: true, ...schemaOptions })
export class User implements BaseDocument {
  @Prop(publicId)
  id: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ type: String, default: null })
  avatarUrl: string | null;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({
    type: String,
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.USER,
  })
  role: UserRole;

  @Prop({ type: String, default: null })
  refreshTokenHash: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
