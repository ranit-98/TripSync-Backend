import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class PhotoCaptionDto {
  @ApiPropertyOptional({ example: 'Sunset near the beach shack.' })
  @IsOptional()
  @IsString()
  caption?: string;
}

export class CreatePhotoDto extends PhotoCaptionDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Image file uploaded as multipart/form-data.',
  })
  image: Express.Multer.File;
}

export class UpdatePhotoDto extends PhotoCaptionDto {}
