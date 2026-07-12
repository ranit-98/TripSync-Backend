import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Shared offset pagination contract for collection endpoints. */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class SearchPaginationQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class ExpenseListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;
}

export class NotificationListQueryDto extends SearchPaginationQueryDto {
  @IsOptional()
  @IsIn(['all', 'invite', 'expense', 'itinerary'])
  category: 'all' | 'invite' | 'expense' | 'itinerary' = 'all';
}

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
};

export const paginationMeta = (
  { page, limit }: PaginationQueryDto,
  total: number,
): PaginationMeta => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page * limit < total,
});
