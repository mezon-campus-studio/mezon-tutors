import { Injectable, OnModuleInit } from '@nestjs/common';
import { MezonBotService } from '../mezon-bot.service';
import { isTrigger, parseCommand } from '../../../shared/utils/bot.util';
import { CommandService } from '../commands/command.service';
import { ChannelMessageEvent } from '../constants';

@Injectable()
export class ListenersService implements OnModuleInit {
    private messageListenerRegistered = false;

    constructor(
        private readonly mezonBotService: MezonBotService,
        private readonly commandService: CommandService,
    ) {}

    async onModuleInit() {
        if (this.messageListenerRegistered) {
            return;
        }
        this.messageListenerRegistered = true;

        this.registerMessageListener();
    }

    private registerMessageListener() {
        this.mezonBotService.getClient().onChannelMessage(async (event: ChannelMessageEvent) => {
            if (event.sender_id === this.mezonBotService.getClient().clientId) {
                return;
            }

            if (isTrigger(event?.content?.t ?? '')) {
                const { commandName, args } = parseCommand(event?.content?.t ?? '');

                await this.commandService.handle(event, commandName, args);
            }
        });
    }
}
