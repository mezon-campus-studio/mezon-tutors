import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminGuard } from '../../common/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUserPayload } from '../auth/interfaces/auth.interfaces';
import { CreateWalletWithdrawalDto } from './dto/create-wallet-withdrawal.dto';
import { GetAdminWalletTransactionsDto } from './dto/get-admin-wallet-transactions.dto';
import { GetWalletTransactionsDto } from './dto/get-wallet-transactions.dto';
import { GetWalletWithdrawalsDto } from './dto/get-wallet-withdrawals.dto';
import {
  ApproveWithdrawalAdminDto,
  UpdateWithdrawalAdminDto,
} from './dto/update-withdrawal-admin.dto';
import { WalletService } from './wallet.service';
import { UpdateWalletPayoutBankDto } from './dto/update-wallet-payout-bank.dto';
import { SkipApiResponseWrap } from '../../common/decorators/skip-api-response-wrap.decorator';

@Controller('wallet')
@ApiTags('Wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('detail')
  @ApiOperation({ summary: 'Wallet detail (balances, pending, lifetime totals)' })
  getDetail(@Req() req: Request) {
    const user = req.user as AuthUserPayload;
    return this.walletService.getDetails(user.sub);
  }

  @Get('stat')
  @ApiOperation({ summary: 'Wallet stats (month activity, transaction count)' })
  getStat(@Req() req: Request) {
    const user = req.user as AuthUserPayload;
    return this.walletService.getStats(user.sub);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Wallet transactions (paginated)' })
  getTransactions(@Req() req: Request, @Query() query: GetWalletTransactionsDto) {
    const user = req.user as AuthUserPayload;
    return this.walletService.getTransactions(
      user.sub,
      query.page,
      query.limit,
    );
  }

  @Get('withdrawals')
  getWithdrawals(@Req() req: Request, @Query() query: GetWalletWithdrawalsDto) {
    const user = req.user as AuthUserPayload;
    return this.walletService.getWithdrawals(
      user.sub,
      query.page,
      query.limit,
    );
  }

  @Get('admin/withdrawals')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Admin: list all withdrawals (paginated)' })
  getAllWithdrawals(@Query() query: GetWalletWithdrawalsDto) {
    return this.walletService.getAllWithdrawals(query.page, query.limit);
  }

  @Get('admin/transactions/stats')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Admin: wallet transaction statistics' })
  getAdminTransactionStats() {
    return this.walletService.getAdminTransactionStats();
  }

  @Get('admin/transactions')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Admin: list all wallet transactions (paginated)' })
  getAllTransactions(@Query() query: GetAdminWalletTransactionsDto) {
    return this.walletService.getAllTransactions(
      query.page,
      query.limit,
      query.direction,
    );
  }

  @Post('withdrawals')
  @HttpCode(HttpStatus.NO_CONTENT)
  @SkipApiResponseWrap()
  @ApiOperation({ summary: 'Request a withdrawal (pending admin approval)' })
  async createWithdrawal(@Req() req: Request, @Body() body: CreateWalletWithdrawalDto) {
    const user = req.user as AuthUserPayload;
    await this.walletService.createWithdrawal(user.sub, body);
  }

  @Patch('payout-bank')
  @ApiOperation({ summary: 'Update payout bank account (student or tutor)' })
  updatePayoutBank(@Req() req: Request, @Body() body: UpdateWalletPayoutBankDto) {
    const user = req.user as AuthUserPayload;
    return this.walletService.updatePayoutBank(user.sub, body);
  }

  @Patch('withdrawals/:id/approve')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Admin: approve withdrawal and settle funds' })
  approveWithdrawal(@Param('id') id: string, @Body() body: ApproveWithdrawalAdminDto) {
    return this.walletService.approveWithdrawal(id, {
      adminNote: body.adminNote,
      paymentProofUrl: body.paymentProofUrl,
      paymentProofPublicId: body.paymentProofPublicId,
    });
  }

  @Patch('withdrawals/:id/reject')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Admin: reject withdrawal and return funds to balance' })
  rejectWithdrawal(@Param('id') id: string, @Body() body: UpdateWithdrawalAdminDto) {
    return this.walletService.rejectWithdrawal(id, body.adminNote);
  }
}
