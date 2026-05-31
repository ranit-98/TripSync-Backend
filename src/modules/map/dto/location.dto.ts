import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateLocationDto {
  @ApiProperty({ example: 'Baga Beach' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Baga, Goa 403516, India' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 15.5553 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 73.7517 })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class UpdateLocationDto extends PartialType(CreateLocationDto) {}
