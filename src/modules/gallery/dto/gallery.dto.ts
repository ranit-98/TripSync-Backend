import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class PhotoCaptionDto {
  @ApiPropertyOptional({ example: 'Sunset near the beach shack.' })
  @IsOptional()
  @IsString()
  caption?: string;
}

export class CreatePhotoDto extends PhotoCaptionDto {
  @ApiProperty({ example: 'trip-sync/trips/trip-id/photo/123-sunset.jpg' })
  @IsString()
  objectKey: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/example/image/upload/v1/sunset.jpg' })
  @IsUrl()
  url: string;

  @ApiProperty({ example: 'sunset.jpg' })
  @IsString()
  originalFileName: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  mimeType: string;

  @ApiProperty({ example: 2483200 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  size: number;
}

export class UpdatePhotoDto extends PhotoCaptionDto {}
