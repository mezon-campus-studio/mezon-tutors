import { Module, forwardRef } from '@nestjs/common';
import { CommandService } from './command.service';
import { SetupCommand } from './setup/setup.command';
import { UserModule } from '../../user/user.module';
import { MezonBotModule } from '../mezon-bot.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { MeetingCommand } from './meeting/meeting.command';

@Module({
  imports: [UserModule, PrismaModule, forwardRef(() => MezonBotModule)],
  providers: [CommandService, SetupCommand, MeetingCommand],
  exports: [CommandService],
})
export class CommandModule {}
