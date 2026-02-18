import { IsString, IsNotEmpty } from 'class-validator';

export class GoogleCallbackDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}
