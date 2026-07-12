import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { MESSAGES } from '../../common/constants/messages.constants';
import { TripRoles } from '../../common/decorators/trip-roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TripMemberGuard } from '../../common/guards/trip-member.guard';
import { TRIP_MEMBER_ROLES } from '../../common/constants/roles.constants';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';
import { ExpensesService } from './expenses.service';
import {
  ExpenseListQueryDto,
  PaginationQueryDto,
} from '../../common/dto/pagination-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/types/request-user.type';

@Controller('trips/:tripId')
@UseGuards(JwtAuthGuard, TripMemberGuard)
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get('expenses')
  async list(
    @Param('tripId') tripId: string,
    @Query() query: ExpenseListQueryDto,
  ) {
    const result = await this.expenses.list(tripId, query);
    return {
      message: MESSAGES.EXPENSES.LISTED,
      data: result.items,
      pagination: result.pagination,
      summary: result.summary,
    };
  }

  @Post('expenses')
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  @ApiBody({ type: CreateExpenseDto })
  async create(@Param('tripId') tripId: string, @Body() dto: CreateExpenseDto) {
    return {
      message: MESSAGES.EXPENSES.CREATED,
      data: await this.expenses.create(tripId, dto),
    };
  }

  @Get('expenses/:expenseId')
  async find(
    @Param('tripId') tripId: string,
    @Param('expenseId') expenseId: string,
  ) {
    return {
      message: MESSAGES.EXPENSES.FETCHED,
      data: await this.expenses.find(tripId, expenseId),
    };
  }

  @Patch('expenses/:expenseId')
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  @ApiBody({ type: UpdateExpenseDto })
  async update(
    @Param('tripId') tripId: string,
    @Param('expenseId') expenseId: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return {
      message: MESSAGES.EXPENSES.UPDATED,
      data: await this.expenses.update(tripId, expenseId, dto),
    };
  }

  @Delete('expenses/:expenseId')
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  async delete(
    @Param('tripId') tripId: string,
    @Param('expenseId') expenseId: string,
  ) {
    await this.expenses.delete(tripId, expenseId);
    return { message: MESSAGES.EXPENSES.DELETED };
  }

  @Get('settlements')
  async settlements(
    @Param('tripId') tripId: string,
    @Query() query: PaginationQueryDto,
  ) {
    const result = await this.expenses.settlementsSummary(tripId, query);
    return {
      message: MESSAGES.EXPENSES.SETTLEMENTS,
      data: result.items,
      pagination: result.pagination,
    };
  }

  @Post('settlements/:settlementId/declare-paid')
  async declarePaid(
    @Param('tripId') tripId: string,
    @Param('settlementId') settlementId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return {
      message: 'Payment declaration sent for confirmation.',
      data: await this.expenses.declarePaid(tripId, settlementId, user.id),
    };
  }

  @Post('settlements/:settlementId/confirm-paid')
  async confirmPaid(
    @Param('tripId') tripId: string,
    @Param('settlementId') settlementId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return {
      message: MESSAGES.EXPENSES.SETTLED,
      data: await this.expenses.confirmPaid(tripId, settlementId, user.id),
    };
  }

  @Post('settlements/:settlementId/reminder')
  async reminder(
    @Param('tripId') tripId: string,
    @Param('settlementId') settlementId: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.expenses.sendReminder(tripId, settlementId, user.id);
    return { message: MESSAGES.EXPENSES.REMINDER_SENT };
  }
}
