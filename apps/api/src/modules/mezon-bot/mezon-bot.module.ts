import { Module } from '@nestjs/common';
import { MezonBotService } from './mezon-bot.service';

@Module({
  providers: [MezonBotService],
  exports: [MezonBotService],
})
export class MezonBotModule {}
