import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateUserTimezoneDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  timezone!: string;
}
