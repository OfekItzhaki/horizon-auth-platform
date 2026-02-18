import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationFrequency } from '@prisma/client';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'User full name',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'URL to user profile picture',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  profilePicture?: string;

  @ApiPropertyOptional({
    description: 'User password (minimum 8 characters)',
    example: 'newpassword123',
    minLength: 8,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({
    description: 'User preference for task update notifications',
    enum: ['NONE', 'DAILY', 'WEEKLY'],
    example: 'DAILY',
  })
  @IsOptional()
  @IsEnum(NotificationFrequency)
  notificationFrequency?: NotificationFrequency;
  @ApiPropertyOptional({
    description: 'Number of days to keep items in trash before purging',
    example: 30,
    minimum: 1,
    maximum: 365,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  trashRetentionDays?: number;
}
