import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Aarav Sharma' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/demo/image/upload/avatar.jpg',
  })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'CurrentPass123' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ minLength: 8, example: 'NewStrongPass123' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
