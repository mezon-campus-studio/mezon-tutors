import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateWalletWithdrawalDto {
  @IsInt()
  @Min(1)
  amount!: number;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  bankName!: string;

  @IsString()
  @MinLength(4)
  @MaxLength(50)
  bankAccountNumber!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  bankAccountName!: string;
}
