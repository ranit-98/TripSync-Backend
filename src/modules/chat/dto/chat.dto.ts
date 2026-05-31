import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsUrl, Min } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({ example: 'Let us meet at the hotel lobby at 5 PM.' })
  @IsString()
  body: string;
}

export class CreateAttachmentDto {
  @ApiProperty({ example: 'trips/goa/chat/receipt.pdf' })
  @IsString()
  objectKey: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/raw/upload/receipt.pdf',
  })
  @IsUrl()
  url: string;

  @ApiProperty({ example: 'receipt.pdf' })
  @IsString()
  originalFileName: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  mimeType: string;

  @ApiProperty({ minimum: 0, example: 180224 })
  @IsNumber()
  @Min(0)
  size: number;
}
