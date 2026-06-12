import { Injectable } from '@nestjs/common';
import { Role } from '@mezon-tutors/db';
import { BotCommand, CommandContext } from '../command.interface';
import { MezonBotService } from '../../mezon-bot.service';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class SetupCommand implements BotCommand {
    name = 'setup';
    isPublic = false;

    constructor(
        private readonly mezonBotService: MezonBotService,
        private readonly prisma: PrismaService,
    ) {}

    async execute(ctx: CommandContext) {
        const { event, entryUser } = ctx;
        const channelId = event.channel_id ?? '';
        const messageId = event.message_id ?? '';

        try {
            if (entryUser.role !== Role.TUTOR) {
                await this.mezonBotService.replyMessage(channelId, messageId, {
                    t: '❌ This command is only available for tutors.',
                });
                return;
            }

            const clanId = event.clan_id;
            if (!clanId) {
                await this.mezonBotService.replyMessage(channelId, messageId, {
                    t: '❌ Cannot determine clan. Please run the command in the Mezon clan channel.',
                });
                return;
            }

            const profile = await this.prisma.tutorProfile.findUnique({
                where: { userId: entryUser.id },
            });

            if (!profile) {
                await this.mezonBotService.replyMessage(channelId, messageId, {
                    t: '❌ Cannot find tutor profile. Please complete the tutor registration before.',
                });
                return;
            }

            await this.prisma.tutorProfile.update({
                where: { userId: entryUser.id },
                data: { mezonClanId: clanId },
            });

            await this.prisma.tutorSetupChecklist.updateMany({
                where: { tutorId: profile.id },
                data: { setupMezonClanComplete: true },
            });

            await this.mezonBotService.replyMessage(channelId, messageId, {
                t: '✔️ Clan setup successful! The Mezon clan of your account has been linked to the tutor profile.',
            });
        } catch (error) {
            console.error('Error executing setup command:', error);
            await this.mezonBotService.replyMessage(channelId, messageId, {
                t: '❌ There was an error setting up the clan. Please try again later.',
            });
        }
    }
}
