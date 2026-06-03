import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { WalletController } from './wallet.controller';
import { WalletCheckoutService } from './wallet-checkout.service';
import { WalletService } from './wallet.service';

@Module({
  imports: [PrismaModule, AuthModule, NotificationModule],
  controllers: [WalletController],
  providers: [WalletService, WalletCheckoutService],
  exports: [WalletService, WalletCheckoutService],
})
export class WalletModule {}
