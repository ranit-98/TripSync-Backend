import { randomUUID } from 'crypto';

export type BaseDocument = {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
};

// Public UUIDs keep API routes stable while MongoDB still owns its internal _id.
export const publicId = {
  type: String,
  default: randomUUID,
  unique: true,
  index: true,
};

// API responses should expose domain fields, not MongoDB implementation details.
export const schemaOptions = {
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform: (_document: unknown, ret: Record<string, unknown>) => {
      delete ret._id;
      return ret;
    },
  },
  toObject: {
    virtuals: true,
    transform: (_document: unknown, ret: Record<string, unknown>) => {
      delete ret._id;
      return ret;
    },
  },
} as const;
