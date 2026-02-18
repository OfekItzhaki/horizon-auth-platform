import { IsEmail, IsString, IsOptional, MinLength, IsEnum, IsInt } from 'class-validator';

export class UpdateUserDto {
    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    profilePicture?: string;

    @IsString()
    @IsOptional()
    @MinLength(8)
    password?: string;

    @IsEnum(['NONE', 'DAILY', 'WEEKLY'])
    @IsOptional()
    notificationFrequency?: 'NONE' | 'DAILY' | 'WEEKLY';

    @IsInt()
    @IsOptional()
    trashRetentionDays?: number;
}
