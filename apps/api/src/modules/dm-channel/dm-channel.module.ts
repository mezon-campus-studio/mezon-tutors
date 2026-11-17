import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DmChannelController } from './dm-channel.controller';
import { DmChannelService } from './dm-channel.service';
import { MezonChannelVerificationService } from './mezon-channel-verification.service';

@Module({
  imports: [PrismaModule],
  controllers: [DmChannelController],
  providers: [DmChannelService, MezonChannelVerificationService],
  exports: [DmChannelService],
})
export class DmChannelModule {}
