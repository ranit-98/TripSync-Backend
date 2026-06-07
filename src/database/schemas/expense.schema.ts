import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { SETTLEMENT_STATUSES } from '../../common/constants/roles.constants';
import { type BaseDocument, publicId, schemaOptions } from './base.schema';

@Schema({ collection: 'expenses', timestamps: true, ...schemaOptions })
export class Expense implements BaseDocument {
  @Prop(publicId)
  id: string;

  @Prop({ required: true, index: true })
  tripId: string;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ required: true, trim: true })
  category: string;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ default: 'USD', uppercase: true, trim: true })
  currency: string;

  @Prop({ required: true, index: true })
  paidByUserId: string;

  @Prop({ required: true })
  expenseDate: Date;

  @Prop({ type: String, default: null })
  notes: string | null;

  createdAt: Date;
  updatedAt: Date;
}

@Schema({ collection: 'expense_splits', timestamps: false, ...schemaOptions })
export class ExpenseSplit implements BaseDocument {
  @Prop(publicId)
  id: string;

  @Prop({ required: true, index: true })
  expenseId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, min: 0 })
  amount: number;
}

@Schema({
  collection: 'settlements',
  timestamps: { createdAt: false, updatedAt: true },
  ...schemaOptions,
})
export class Settlement implements BaseDocument {
  @Prop(publicId)
  id: string;

  @Prop({ required: true, index: true })
  tripId: string;

  @Prop({ required: true })
  fromUserId: string;

  @Prop({ required: true })
  toUserId: string;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({
    type: String,
    enum: Object.values(SETTLEMENT_STATUSES),
    default: SETTLEMENT_STATUSES.PENDING,
  })
  status: string;

  updatedAt: Date;
}

export type ExpenseDocument = HydratedDocument<Expense>;
export type ExpenseSplitDocument = HydratedDocument<ExpenseSplit>;
export type SettlementDocument = HydratedDocument<Settlement>;

export const ExpenseSchema = SchemaFactory.createForClass(Expense);
export const ExpenseSplitSchema = SchemaFactory.createForClass(ExpenseSplit);
export const SettlementSchema = SchemaFactory.createForClass(Settlement);
