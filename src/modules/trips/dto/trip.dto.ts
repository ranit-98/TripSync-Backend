import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  TRIP_MEMBER_ROLES,
  type TripMemberRole,
} from '../../../common/constants/roles.constants';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class CreateTripDto {
  @ApiProperty({ example: 'Goa Friends Trip' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Goa, India' })
  @IsString()
  destination: string;

  @ApiProperty({ format: 'date', example: '2026-08-12' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ format: 'date', example: '2026-08-18' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ example: 'INR', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ minimum: 0, example: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/demo/image/upload/goa-cover.jpg',
  })
  @IsOptional()
  @IsUrl()
  coverUrl?: string;

  @ApiPropertyOptional({
    type: [String],
    maxItems: 12,
    example: ['beach', 'food', 'nightlife'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  styles?: string[];

  @ApiPropertyOptional({ example: 'friend@example.com' })
  @IsOptional()
  @IsEmail()
  inviteEmail?: string;

  @ApiPropertyOptional({
    enum: TRIP_MEMBER_ROLES,
    example: TRIP_MEMBER_ROLES.VIEWER,
  })
  @IsOptional()
  @IsEnum(TRIP_MEMBER_ROLES)
  inviteRole?: TripMemberRole;

  @ApiPropertyOptional({ example: 'Can you help with hotel planning?' })
  @IsOptional()
  @IsString()
  inviteNotes?: string;
}

export class UpdateTripDto {
  @ApiPropertyOptional({ example: 'Goa Friends Trip' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Goa, India' })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional({ format: 'date', example: '2026-08-12' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ format: 'date', example: '2026-08-18' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ minimum: 0, example: 55000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/demo/image/upload/new-cover.jpg',
  })
  @IsOptional()
  @IsUrl()
  coverUrl?: string;

  @ApiPropertyOptional({ type: [String], example: ['beach', 'relax'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  styles?: string[];
}

export class InviteMemberDto {
  @ApiProperty({ example: 'friend@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: TRIP_MEMBER_ROLES, example: TRIP_MEMBER_ROLES.VIEWER })
  @IsEnum(TRIP_MEMBER_ROLES)
  role: TripMemberRole;

  @ApiPropertyOptional({ example: 'Please join the planning board.' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateMemberDto {
  @ApiProperty({
    enum: TRIP_MEMBER_ROLES,
    example: TRIP_MEMBER_ROLES.COLLABORATOR,
  })
  @IsEnum(TRIP_MEMBER_ROLES)
  role: TripMemberRole;
}

export class UploadCoverDto {
  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/image/upload/goa-cover.jpg',
  })
  @IsUrl()
  coverUrl: string;
}
