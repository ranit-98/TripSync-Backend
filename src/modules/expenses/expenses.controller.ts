import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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

@Controller('trips/:tripId')
@UseGuards(JwtAuthGuard, TripMemberGuard)
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get('expenses')
  async list(@Param('tripId') tripId: string) {
    return {
      message: MESSAGES.EXPENSES.LISTED,
      data: await this.expenses.list(tripId),
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
  async delete(@Param('expenseId') expenseId: string) {
    await this.expenses.delete(expenseId);
    return { message: MESSAGES.EXPENSES.DELETED };
  }

  @Get('settlements')
  async settlements(@Param('tripId') tripId: string) {
    return {
      message: MESSAGES.EXPENSES.SETTLEMENTS,
      data: await this.expenses.settlementsSummary(tripId),
    };
  }

  @Post('settlements/:settlementId/mark-paid')
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  async markPaid(@Param('settlementId') settlementId: string) {
    return {
      message: MESSAGES.EXPENSES.SETTLED,
      data: await this.expenses.markPaid(settlementId),
    };
  }

  @Post('settlements/reminders')
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  reminders() {
    return { message: MESSAGES.EXPENSES.REMINDER_SENT };
  }
}
