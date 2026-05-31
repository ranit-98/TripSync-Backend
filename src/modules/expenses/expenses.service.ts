import { Injectable, NotFoundException } from '@nestjs/common';
import { MESSAGES } from '../../common/constants/messages.constants';
import { SETTLEMENT_STATUSES } from '../../common/constants/roles.constants';
import { PrismaService } from '../../database/prisma.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tripId: string) {
    return this.prisma.expense.findMany({
      where: { tripId },
      include: { splits: true, paidBy: true },
      orderBy: { expenseDate: 'desc' },
    });
  }

  create(tripId: string, dto: CreateExpenseDto) {
    return this.prisma.expense.create({
      data: {
        description: dto.description,
        category: dto.category,
        amount: dto.amount,
        currency: dto.currency ?? 'USD',
        paidByUserId: dto.paidByUserId,
        expenseDate: new Date(dto.expenseDate),
        notes: dto.notes,
        tripId,
        splits: {
          create: dto.splits.map((split) => ({
            userId: split.userId,
            amount: split.amount,
          })),
        },
      },
      include: { splits: true, paidBy: true },
    });
  }

  async find(tripId: string, expenseId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, tripId },
      include: { splits: true, paidBy: true },
    });
    if (!expense) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    return expense;
  }

  async update(tripId: string, expenseId: string, dto: UpdateExpenseDto) {
    await this.find(tripId, expenseId);
    await this.prisma.$transaction(async (tx) => {
      if (dto.splits !== undefined) {
        await tx.expenseSplit.deleteMany({ where: { expenseId } });
      }
      await tx.expense.update({
        where: { id: expenseId },
        data: {
          description: dto.description,
          category: dto.category,
          amount: dto.amount,
          currency: dto.currency,
          paidByUserId: dto.paidByUserId,
          expenseDate:
            dto.expenseDate === undefined
              ? undefined
              : new Date(dto.expenseDate),
          notes: dto.notes,
          splits:
            dto.splits === undefined
              ? undefined
              : {
                  create: dto.splits.map((split) => ({
                    userId: split.userId,
                    amount: split.amount,
                  })),
                },
        },
      });
    });
    return this.find(tripId, expenseId);
  }

  async delete(expenseId: string) {
    await this.prisma.expense.delete({ where: { id: expenseId } });
  }

  settlementsSummary(tripId: string) {
    return this.prisma.settlement.findMany({
      where: { tripId },
      include: { fromUser: true, toUser: true },
    });
  }

  markPaid(settlementId: string) {
    return this.prisma.settlement.update({
      where: { id: settlementId },
      data: { status: SETTLEMENT_STATUSES.PAID },
    });
  }
}
