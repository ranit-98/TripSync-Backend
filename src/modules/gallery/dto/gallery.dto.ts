import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class PhotoCaptionDto {
  @ApiPropertyOptional({ example: 'Sunset near the beach shack.' })
  @IsOptional()
  @IsString()
  caption?: string;
}

export class CreatePhotoDto extends PhotoCaptionDto {
  @ApiPropertyOptional({
    description: 'Image file uploaded as multipart/form-data.',
    format: 'binary',
    type: 'string',
  })
  @IsOptional()
  image?: unknown;

  @ApiPropertyOptional({
    example: 'trip-sync/trips/trip-id/photo/123-sunset.jpg',
  })
  @IsOptional()
  @IsString()
  objectKey?: string;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/example/image/upload/v1/sunset.jpg',
  })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ example: 'sunset.jpg' })
  @IsOptional()
  @IsString()
  originalFileName?: string;

  @ApiPropertyOptional({ example: 'image/jpeg' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ example: 2483200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  size?: number;
}

export class UpdatePhotoDto extends PhotoCaptionDto {}
