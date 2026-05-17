import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUserPayload } from '../auth/interfaces/auth.interfaces';
import { CreateWalletWithdrawalDto } from './dto/create-wallet-withdrawal.dto';
import { GetWalletTransactionsDto } from './dto/get-wallet-transactions.dto';
import { GetWalletWithdrawalsDto } from './dto/get-wallet-withdrawals.dto';
import { WalletService } from './wallet.service';

@Controller('wallet')
@ApiTags('Wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('detail')
  @ApiOperation({ summary: 'Wallet detail (balances, pending, lifetime totals)' })
  getDetail(@Req() req: Request) {
    const user = req.user as AuthUserPayload;
    return this.walletService.getDetails(user.sub, user.role);
  }

  @Get('stat')
  @ApiOperation({ summary: 'Wallet stats (month activity, transaction count)' })
  getStat(@Req() req: Request) {
    const user = req.user as AuthUserPayload;
    return this.walletService.getStats(user.sub, user.role);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Wallet transactions (paginated)' })
  getTransactions(@Req() req: Request, @Query() query: GetWalletTransactionsDto) {
    const user = req.user as AuthUserPayload;
    return this.walletService.getTransactions(
      user.sub,
      user.role,
      query.page,
      query.limit,
    );
  }

  @Get('withdrawals')
  getWithdrawals(@Req() req: Request, @Query() query: GetWalletWithdrawalsDto) {
    const user = req.user as AuthUserPayload;
    return this.walletService.getWithdrawals(
      user.sub,
      user.role,
      query.page,
      query.limit,
    );
  }

  @Post('withdrawals')
  createWithdrawal(@Req() req: Request, @Body() body: CreateWalletWithdrawalDto) {
    const user = req.user as AuthUserPayload;
    return this.walletService.createWithdrawal(user.sub, user.role, body);
  }
}
