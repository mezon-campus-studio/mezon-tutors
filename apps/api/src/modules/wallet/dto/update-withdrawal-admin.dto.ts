import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateWithdrawalAdminDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string;
}

export class ApproveWithdrawalAdminDto extends UpdateWithdrawalAdminDto {
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  paymentProofUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  paymentProofPublicId?: string;
}
