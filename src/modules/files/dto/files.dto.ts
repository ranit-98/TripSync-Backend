import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class CreateFolderDto {
  @ApiProperty({ example: 'Hotel bookings' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'All reservation PDFs and invoices.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'parent-folder-id', nullable: true })
  @IsOptional()
  @IsString()
  parentId?: string | null;
}

export class UpdateFolderDto extends PartialType(CreateFolderDto) {}

export class CreateDocumentDto {
  @ApiProperty({ example: 'trips/goa/documents/hotel-booking.pdf' })
  @IsString()
  objectKey: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/raw/upload/hotel-booking.pdf',
  })
  @IsUrl()
  url: string;

  @ApiProperty({ example: 'Hotel booking confirmation' })
  @IsString()
  displayName: string;

  @ApiProperty({ example: 'booking.pdf' })
  @IsString()
  originalFileName: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  mimeType: string;

  @ApiProperty({ minimum: 0, example: 502344 })
  @IsNumber()
  @Min(0)
  size: number;
}

export class UpdateDocumentDto {
  @ApiProperty({ example: 'Updated hotel booking confirmation' })
  @IsString()
  displayName: string;
}
