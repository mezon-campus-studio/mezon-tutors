import { Module } from '@nestjs/common';
import { ListenersService } from './listeners.service';
import { CommandModule } from '../commands/command.module';
import { MezonBotModule } from '../mezon-bot.module';

@Module({
    imports: [MezonBotModule, CommandModule],
    providers: [ListenersService],
    exports: [ListenersService],
})
export class ListenersModule {}
