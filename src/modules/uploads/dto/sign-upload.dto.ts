import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export const uploadTargets = ['photo', 'document', 'cover', 'chat'] as const;
export type UploadTarget = (typeof uploadTargets)[number];

export class SignUploadDto {
  @ApiProperty({ example: 'sunset.jpg' })
  @IsString()
  fileName: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  mimeType: string;

  @ApiProperty({ enum: uploadTargets, example: 'photo' })
  @IsIn(uploadTargets)
  target: UploadTarget;
}
