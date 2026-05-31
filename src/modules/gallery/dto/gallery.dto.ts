import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class CreatePhotoDto {
  @ApiProperty({ example: 'trips/goa/photos/sunset.jpg' })
  @IsString()
  objectKey: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/image/upload/sunset.jpg',
  })
  @IsUrl()
  url: string;

  @ApiProperty({ example: 'sunset.jpg' })
  @IsString()
  originalFileName: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  mimeType: string;

  @ApiProperty({ minimum: 0, example: 245760 })
  @IsNumber()
  @Min(0)
  size: number;

  @ApiPropertyOptional({ example: 'Sunset near the beach shack.' })
  @IsOptional()
  @IsString()
  caption?: string;
}

export class UpdatePhotoDto extends PartialType(CreatePhotoDto) {}
