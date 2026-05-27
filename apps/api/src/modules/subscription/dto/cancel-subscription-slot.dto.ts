import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CancelSubscriptionSlotBodyDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsOptional()
  @IsString()
  message?: string;
}
