import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { MESSAGES } from '../../common/constants/messages.constants';
import { SETTLEMENT_STATUSES } from '../../common/constants/roles.constants';
import {
  Expense,
  ExpenseSplit,
  Settlement,
  type User,
} from '../../database/schemas';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ExpenseListQueryDto,
  PaginationQueryDto,
  paginationMeta,
} from '../../common/dto/pagination-query.dto';

type ExpenseReadModel = Expense & {
  splits: Array<ExpenseSplit & { user: User | null }>;
  paidBy: User | null;
};

type SettlementReadModel = Settlement & {
  fromUser: User | null;
  toUser: User | null;
};

@Injectable()
export class ExpensesService {
  constructor(
    @InjectModel(Expense.name) private readonly expenses: Model<Expense>,
    @InjectModel(ExpenseSplit.name)
    private readonly expenseSplits: Model<ExpenseSplit>,
    @InjectModel(Settlement.name)
    private readonly settlements: Model<Settlement>,
    private readonly notifications: NotificationsService,
  ) {}

  async list(tripId: string, query: ExpenseListQueryDto) {
    const filter = {
      tripId,
      ...(query.category ? { category: query.category } : {}),
    };
    const pipeline = this.expenseReadPipeline(filter);
    const [items, total] = await Promise.all([
      this.expenses
        .aggregate<ExpenseReadModel>([
          ...pipeline,
          { $skip: (query.page - 1) * query.limit },
          { $limit: query.limit },
        ])
        .exec(),
      this.expenses.countDocuments(filter).exec(),
    ]);
    return { items, pagination: paginationMeta(query, total) };
  }

  async create(tripId: string, dto: CreateExpenseDto) {
    const expense = await this.expenses.create({
      description: dto.description,
      category: dto.category,
      amount: dto.amount,
      currency: dto.currency ?? 'USD',
      paidByUserId: dto.paidByUserId,
      expenseDate: new Date(dto.expenseDate),
      notes: dto.notes ?? null,
      tripId,
    });
    const expenseId = String(expense.id);

    await this.expenseSplits.insertMany(
      dto.splits.map((split) => ({
        expenseId,
        userId: split.userId,
        amount: split.amount,
      })),
    );

    await this.recalculateSettlements(tripId);

    return this.find(tripId, expenseId);
  }

  async find(tripId: string, expenseId: string) {
    const [expense] = await this.expenses
      .aggregate<ExpenseReadModel>(
        this.expenseReadPipeline({ id: expenseId, tripId }),
      )
      .exec();
    if (!expense) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    return expense;
  }

  async update(tripId: string, expenseId: string, dto: UpdateExpenseDto) {
    await this.find(tripId, expenseId);

    const update = {
      description: dto.description,
      category: dto.category,
      amount: dto.amount,
      currency: dto.currency,
      paidByUserId: dto.paidByUserId,
      expenseDate:
        dto.expenseDate === undefined ? undefined : new Date(dto.expenseDate),
      notes: dto.notes,
    };

    await this.expenses.updateOne({ id: expenseId }, update).exec();

    // Split replacement is intentional: the client sends the full desired split set.
    if (dto.splits !== undefined) {
      await this.expenseSplits.deleteMany({ expenseId }).exec();
      await this.expenseSplits.insertMany(
        dto.splits.map((split) => ({
          expenseId,
          userId: split.userId,
          amount: split.amount,
        })),
      );
    }

    await this.recalculateSettlements(tripId);

    return this.find(tripId, expenseId);
  }

  async delete(tripId: string, expenseId: string) {
    await this.expenses.deleteOne({ id: expenseId, tripId }).exec();
    await this.expenseSplits.deleteMany({ expenseId }).exec();
    await this.recalculateSettlements(tripId);
  }

  async settlementsSummary(tripId: string, query: PaginationQueryDto) {
    const pipeline: PipelineStage[] = [
      { $match: { tripId } },
      {
        $sort: { status: 1, amount: -1 },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'fromUserId',
          foreignField: 'id',
          pipeline: [this.publicUserProject()],
          as: 'fromUser',
        },
      },
      { $unwind: { path: '$fromUser', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'toUserId',
          foreignField: 'id',
          pipeline: [this.publicUserProject()],
          as: 'toUser',
        },
      },
      { $unwind: { path: '$toUser', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0 } },
    ];
    const [items, total] = await Promise.all([
      this.settlements
        .aggregate<SettlementReadModel>([
          ...pipeline,
          { $skip: (query.page - 1) * query.limit },
          { $limit: query.limit },
        ])
        .exec(),
      this.settlements.countDocuments({ tripId }).exec(),
    ]);
    return { items, pagination: paginationMeta(query, total) };
  }

  async declarePaid(tripId: string, settlementId: string, userId: string) {
    const settlement = await this.settlements
      .findOne({
        id: settlementId,
        tripId,
        fromUserId: userId,
        status: SETTLEMENT_STATUSES.PENDING,
      })
      .exec();
    if (!settlement)
      throw new ForbiddenException(
        'Only the member who owes this amount can declare payment.',
      );
    settlement.status = SETTLEMENT_STATUSES.PAYMENT_DECLARED;
    await settlement.save();
    await this.notifications.createForUser(settlement.toUserId, {
      tripId,
      type: 'settlement_payment_declared',
      title: 'Payment awaiting your confirmation',
      body: `A trip member declared payment of ${settlement.amount}. Confirm after you receive it.`,
      resourceType: 'settlement',
      resourceId: settlement.id,
    });
    return settlement;
  }

  async confirmPaid(tripId: string, settlementId: string, userId: string) {
    const settlement = await this.settlements
      .findOne({
        id: settlementId,
        tripId,
        toUserId: userId,
        status: SETTLEMENT_STATUSES.PAYMENT_DECLARED,
      })
      .exec();
    if (!settlement)
      throw new ForbiddenException(
        'Only the member receiving this payment can confirm it.',
      );
    settlement.status = SETTLEMENT_STATUSES.PAID;
    await settlement.save();
    await this.notifications.createForUser(settlement.fromUserId, {
      tripId,
      type: 'settlement_payment_confirmed',
      title: 'Payment confirmed',
      body: `Your payment of ${settlement.amount} was confirmed.`,
      resourceType: 'settlement',
      resourceId: settlement.id,
    });
    return settlement;
  }

  async sendReminder(tripId: string, settlementId: string, userId: string) {
    const settlement = await this.settlements
      .findOne({
        id: settlementId,
        tripId,
        toUserId: userId,
        status: SETTLEMENT_STATUSES.PENDING,
      })
      .exec();
    if (!settlement)
      throw new ForbiddenException('Only the person owed can send a reminder.');
    await this.notifications.createForUser(settlement.fromUserId, {
      tripId,
      type: 'settlement_reminder',
      title: 'Settlement reminder',
      body: `You still owe ${settlement.amount} for this trip.`,
      resourceType: 'settlement',
      resourceId: settlement.id,
    });
    return settlement;
  }

  private async recalculateSettlements(tripId: string) {
    const expenses = await this.expenses.find({ tripId }).lean().exec();
    const expenseIds = expenses.map((expense) => expense.id);
    const splits = await this.expenseSplits
      .find({ expenseId: { $in: expenseIds } })
      .lean()
      .exec();
    const splitsByExpenseId = splits.reduce<Map<string, ExpenseSplit[]>>(
      (result, split) => {
        const current = result.get(split.expenseId) ?? [];
        current.push(split);
        result.set(split.expenseId, current);

        return result;
      },
      new Map(),
    );
    const balances = new Map<string, number>();
    const addBalance = (userId: string, amount: number) => {
      balances.set(
        userId,
        Number(((balances.get(userId) ?? 0) + amount).toFixed(2)),
      );
    };

    expenses.forEach((expense) => {
      addBalance(expense.paidByUserId, Number(expense.amount || 0));

      (splitsByExpenseId.get(expense.id) ?? []).forEach((split) => {
        addBalance(split.userId, -Number(split.amount || 0));
      });
    });

    const debtors = Array.from(balances.entries())
      .filter(([, balance]) => balance < -0.009)
      .map(([userId, balance]) => ({ userId, amount: Math.abs(balance) }))
      .sort((a, b) => b.amount - a.amount);
    const creditors = Array.from(balances.entries())
      .filter(([, balance]) => balance > 0.009)
      .map(([userId, balance]) => ({ userId, amount: balance }))
      .sort((a, b) => b.amount - a.amount);
    const settlements: Array<{
      amount: number;
      fromUserId: string;
      toUserId: string;
      tripId: string;
    }> = [];
    let debtorIndex = 0;
    let creditorIndex = 0;

    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const debtor = debtors[debtorIndex];
      const creditor = creditors[creditorIndex];
      const amount = Number(
        Math.min(debtor.amount, creditor.amount).toFixed(2),
      );

      if (amount > 0) {
        settlements.push({
          amount,
          fromUserId: debtor.userId,
          toUserId: creditor.userId,
          tripId,
        });
      }

      debtor.amount = Number((debtor.amount - amount).toFixed(2));
      creditor.amount = Number((creditor.amount - amount).toFixed(2));

      if (debtor.amount <= 0.009) debtorIndex += 1;
      if (creditor.amount <= 0.009) creditorIndex += 1;
    }

    await this.settlements.deleteMany({ tripId }).exec();

    if (settlements.length) {
      await this.settlements.insertMany(settlements);
    }
  }

  private expenseReadPipeline(match: Record<string, unknown>): PipelineStage[] {
    return [
      { $match: match },
      { $sort: { expenseDate: -1 } },
      {
        $lookup: {
          from: 'expense_splits',
          let: { expenseId: '$id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$expenseId', '$$expenseId'] } } },
            {
              $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: 'id',
                pipeline: [this.publicUserProject()],
                as: 'user',
              },
            },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            { $project: { _id: 0 } },
          ],
          as: 'splits',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'paidByUserId',
          foreignField: 'id',
          pipeline: [this.publicUserProject()],
          as: 'paidBy',
        },
      },
      { $unwind: { path: '$paidBy', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0 } },
    ];
  }

  private publicUserProject(): PipelineStage.Project {
    return {
      $project: {
        _id: 0,
        id: 1,
        name: 1,
        email: 1,
        avatarUrl: 1,
        role: 1,
        createdAt: 1,
      },
    };
  }
}
