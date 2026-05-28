import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateWithdrawalAdminDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string;
}
