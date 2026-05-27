import { ChannelMessageEvent } from '../constants';
import { User } from '@mezon-tutors/db';
export interface BotCommand {
    name: string;
    isPublic: boolean;
    execute(ctx: CommandContext): Promise<void>;
}

export interface CommandContext {
    event: ChannelMessageEvent;
    entryUser: User;
    args: string[];
}
