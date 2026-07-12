import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

export class ExpenseSplitDto {
  @ApiProperty({
    format: 'uuid',
    example: 'a64d086e-e35f-4f4a-bf68-3e9b22d4f99b',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({ minimum: 0, example: 1250 })
  @IsNumber()
  @Min(0)
  amount: number;
}

export class CreateExpenseDto {
  @ApiProperty({ example: 'Dinner at beach cafe' })
  @IsString()
  description: string;

  @ApiProperty({ example: 'food' })
  @IsString()
  category: string;

  @ApiProperty({ minimum: 0, example: 5000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: 'INR', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    format: 'uuid',
    example: 'a64d086e-e35f-4f4a-bf68-3e9b22d4f99b',
  })
  @IsUUID()
  paidByUserId: string;

  @ApiProperty({ format: 'date', example: '2026-08-13' })
  @IsDateString()
  expenseDate: string;

  @ApiPropertyOptional({ example: 'Split equally after tax.' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [ExpenseSplitDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseSplitDto)
  splits: ExpenseSplitDto[];
}

export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}

export class VerifyRazorpaySettlementDto {
  @ApiProperty({ example: 'order_Q0abc123xyz' })
  @IsString()
  @Matches(/^order_[A-Za-z0-9]+$/)
  razorpayOrderId: string;

  @ApiProperty({ example: 'pay_Q0abc123xyz' })
  @IsString()
  @Matches(/^pay_[A-Za-z0-9]+$/)
  razorpayPaymentId: string;

  @ApiProperty({ example: '9ef4a2d0f4d2f0a...' })
  @IsString()
  razorpaySignature: string;
}
