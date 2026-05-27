import { Injectable } from '@nestjs/common';
import { BotCommand, CommandContext } from '../command.interface';
import { MezonBotService } from '../../mezon-bot.service';

@Injectable()
export class MeetingCommand implements BotCommand {
    name = 'meeting';
    isPublic = true;

    constructor(
        private readonly mezonBotService: MezonBotService,
    ) {}

    async execute(ctx: CommandContext) {
        const { event } = ctx;
        const channelId = event.channel_id ?? '';
        const messageId = event.message_id ?? '';

        try {
           const availableChannels = await this.mezonBotService.getAvailableVoiceChannels(event.clan_id ?? '');
           
           if (availableChannels.length === 0) {
            await this.mezonBotService.replyMessage(channelId, messageId, {
                t: '❌ No available voice channels. Please try again later.',
            });
            return;
           }
           
           const channel = availableChannels[0];
           await this.mezonBotService.replyMessage(channelId, messageId, {
            t: channel.name,
            hg: [{
                channelId: channel.id,
                s: 0,
                e: channel.name.length,
            }],
           });
        } catch (error) {
            console.error('Error executing meeting command:', error);
            await this.mezonBotService.replyMessage(channelId, messageId, {
                t: '❌ There was an error finding available voice channels. Please try again later.',
            });
        }
    }
}
