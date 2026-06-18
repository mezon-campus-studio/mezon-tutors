import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { EWalletTransactionDirection, EWalletTransactionType } from '@mezon-tutors/db';

export class GetAdminWalletTransactionsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 15;

  @IsOptional()
  @IsEnum(EWalletTransactionType)
  type?: EWalletTransactionType;

  @IsOptional()
  @IsEnum(EWalletTransactionDirection)
  direction?: EWalletTransactionDirection;
}
