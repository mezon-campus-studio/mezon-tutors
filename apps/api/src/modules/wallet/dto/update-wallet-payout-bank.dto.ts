import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateWalletPayoutBankDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bankName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  bankAccountNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  bankAccountName!: string;
}
