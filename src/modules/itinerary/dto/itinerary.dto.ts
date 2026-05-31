import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class CreateDayDto {
  @ApiProperty({ format: 'date', example: '2026-08-12' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: 'Arrival and beach walk' })
  @IsOptional()
  @IsString()
  title?: string;
}

export class UpdateDayDto {
  @ApiPropertyOptional({ example: 'Arrival and beach walk' })
  @IsOptional()
  @IsString()
  title?: string;
}

export class CreateActivityDto {
  @ApiPropertyOptional({
    format: 'uuid',
    example: '7e2be2c7-baf2-4d77-88fc-367531f9d9b3',
  })
  @IsOptional()
  @IsUUID()
  dayId?: string;

  @ApiProperty({ example: 'Sunset at Baga Beach' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Carry sunscreen and arrive before 5 PM.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Baga Beach, Goa' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: '17:00' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ example: '19:00' })
  @IsOptional()
  @IsString()
  endTime?: string;
}

export class UpdateActivityDto extends PartialType(CreateActivityDto) {}

export class ReorderActivityItemDto {
  @ApiProperty({
    format: 'uuid',
    example: '4e967690-20b5-428d-8d30-47e208f9d5ad',
  })
  @IsUUID()
  activityId: string;

  @ApiProperty({ minimum: 0, example: 1 })
  @IsNumber()
  position: number;

  @ApiPropertyOptional({
    format: 'uuid',
    example: '7e2be2c7-baf2-4d77-88fc-367531f9d9b3',
  })
  @IsOptional()
  @IsUUID()
  dayId?: string;
}

export class ReorderActivitiesDto {
  @ApiProperty({ type: [ReorderActivityItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderActivityItemDto)
  items: ReorderActivityItemDto[];
}
