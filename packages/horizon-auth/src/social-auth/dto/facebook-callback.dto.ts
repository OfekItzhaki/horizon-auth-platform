import { IsString, IsNotEmpty } from 'class-validator';

export class FacebookCallbackDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}
