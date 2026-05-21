import { Injectable } from '@nestjs/common';
import { BotCommand } from './command.interface';
import { ChannelMessageEvent } from '../constants';
import { UserService } from '../../user/user.service';
import { MezonBotService } from '../mezon-bot.service';
import { User } from '@mezon-tutors/db';
import { SetupCommand } from './setup/setup.command';
import { MeetingCommand } from './meeting/meeting.command';
import { AppConfigService } from '../../../shared/services/app-config.service';

@Injectable()
export class CommandService {
  private commands = new Map<string, BotCommand>();

  constructor(
    private readonly mezonBotService: MezonBotService,
    private readonly appConfig: AppConfigService,
    private readonly userService: UserService,
    private readonly setupCommand: SetupCommand,
    private readonly meetingCommand: MeetingCommand
  ) {
    this.register(this.setupCommand);
    this.register(this.meetingCommand);
  }

  register(command: BotCommand) {
    this.commands.set(command.name, command);
  }

  async handle(event: ChannelMessageEvent, commandName: string, args: string[]) {
    let entryUser: User | null = null;

    try {
      const command = this.commands.get(commandName);

      if (!command) {
        await this.mezonBotService.replyMessage(event.channel_id ?? '', event.message_id ?? '', {
          t: '❌ Command not found! Please try again!',
        });
        return;
      }

      if (!command.isPublic) {
        entryUser = await this.userService.findByMezonUserId(event.sender_id ?? '');

        if (entryUser) {
            const feUrl = this.appConfig.frontendUrl;
          await this.mezonBotService.replyMessage(event.channel_id ?? '', event.message_id ?? '', {
            t: '❌ You have not registered an account! Please go to ' + feUrl + ' to register an account!',
            lk: [{
              s: 49,
              e: 49 +feUrl.length,
            }],
          });
          return;
        }
      }

      await command.execute({ event, entryUser: entryUser!, args });
      return;
    } catch (error) {
      console.error('❌ Error executing command `', commandName, '` | root:', error);
    }
  }
}
