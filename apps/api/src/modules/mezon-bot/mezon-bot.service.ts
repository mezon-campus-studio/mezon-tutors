import { Injectable, OnModuleInit } from '@nestjs/common';
import { AppConfigService } from '../../shared/services/app-config.service';
import { ChannelMessageContent, ChannelType, MezonClient } from 'mezon-sdk';
import { User as MezonUser } from 'mezon-sdk/dist/cjs/mezon-client/structures/User';
import { TextChannel } from 'mezon-sdk/dist/cjs/mezon-client/structures/TextChannel';
import { Message } from 'mezon-sdk/dist/cjs/mezon-client/structures/Message';

@Injectable()
export class MezonBotService implements OnModuleInit {
  private client: MezonClient;
  private loggedIn = false;
  private connecting = false;

  constructor(private readonly appConfig: AppConfigService) {
    if (!this.isConfigured()) {
      throw new Error('MezonBot is not configured');
    }

    this.client = new MezonClient({
      botId: this.appConfig.mezonBotConfig.botId,
      token: this.appConfig.mezonBotConfig.botToken,
    });
  }

  onModuleInit() {
    if (!this.appConfig.runsBackgroundJobs) {
      console.info(
        `[MezonBot] role=${this.appConfig.appRole}: bot connection disabled on this instance`
      );
      return;
    }

    void this.connectWithRetry();
  }

  async login(): Promise<void> {
    if (this.loggedIn) {
      return;
    }

    try {
      await this.client.login();
      this.loggedIn = true;
    } catch (error) {
      console.error('Error initializing MezonBotService:', error);
      throw error;
    }
  }

  private async connectWithRetry(): Promise<void> {
    if (this.connecting) {
      return;
    }
    this.connecting = true;

    const maxDelayMs = 60_000;
    let attempt = 0;

    try {
      while (!this.loggedIn) {
        try {
          await this.login();
          console.info('[MezonBot] Connected to Mezon gateway');
        } catch {
          attempt += 1;
          const delayMs = Math.min(5_000 * 2 ** (attempt - 1), maxDelayMs);
          console.error(
            `[MezonBot] Connection cycle ${attempt} failed; retrying in ${delayMs / 1000}s`
          );
          await this.sleep(delayMs);
        }
      }
    } finally {
      this.connecting = false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  isConfigured() {
    const config = this.appConfig.mezonBotConfig;
    return Boolean(config.botId && config.botToken);
  }

  getClient() {
    return this.client;
  }

  private async getChannel(channelId: string): Promise<TextChannel> {
    const channel = await this.client.channels.fetch(channelId);
    if (!channel) {
      const channel = await this.client.channels.get(channelId);
      if (!channel) {
        throw new Error('Channel not found');
      }
      return channel;
    }
    return channel;
  }

  private async getMessage(channel: TextChannel, messageId: string): Promise<Message> {
    const message = await channel.messages.fetch(messageId);
    if (!message) {
      const message = await channel.messages.get(messageId);
      if (!message) {
        throw new Error('Message not found');
      }
      return message;
    }
    return message;
  }

  async sendDMToUser(mezonId: string, messageContent: ChannelMessageContent): Promise<void> {
    let userFetched: MezonUser;
    try {
      userFetched = await this.client.users.fetch(mezonId);
      await userFetched.sendDM(messageContent);
    } catch (error) {
      console.error('Error sending DM to user:', mezonId, '| Error:', error);
    }
  }

  async sendChannelMessage(channelId: string, messageContent: ChannelMessageContent) {
    try {
      const channel = await this.getChannel(channelId);

      await channel.send(messageContent);
    } catch (error) {
      console.error('Error sending channel message:', channelId, '| Error:', error);
    }
  }

  async replyMessage(channelId: string, messageId: string, messageContent: ChannelMessageContent) {
    try {
      const channel = await this.getChannel(channelId);
      const messageFetched = await this.getMessage(channel, messageId);

      return await messageFetched.reply(messageContent);
    } catch (error) {
      console.error('Error replying message:', channelId, '| Error:', error);
    }
  }

  private static readonly VOICE_CHANNEL_TYPE = 10;

  private async loadVoiceChannelsWithOccupancy(
    clanId: string
  ): Promise<Array<{ id: string; name: string; userCount: number }>> {
    const clan = await this.client.clans.fetch(clanId);
    await clan.loadChannels();

    const channelEntries = await clan.channels.cache.entries();
    const channels = Array.from(channelEntries).reduce<Array<{ id: string; name: string }>>(
      (acc, [, channel]) => {
        if (channel.channel_type === MezonBotService.VOICE_CHANNEL_TYPE) {
          acc.push({
            id: channel.id ?? '',
            name: channel.name ?? '',
          });
        }

        return acc;
      },
      []
    );

    const res = await clan.listChannelVoiceUsers();
    const channelsVoiceUsers = res?.voice_channel_users ?? [];
    const userCountByChannel = new Map<string, number>();

    for (const voiceUser of channelsVoiceUsers) {
      const channelId = voiceUser.channel_id;
      if (!channelId) {
        continue;
      }
      userCountByChannel.set(channelId, (userCountByChannel.get(channelId) ?? 0) + 1);
    }

    return channels.map((channel) => ({
      ...channel,
      userCount: userCountByChannel.get(channel.id) ?? 0,
    }));
  }

  async getVoiceChannelsByOccupancy(clanId: string) {
    const channels = await this.loadVoiceChannelsWithOccupancy(clanId);
    return [...channels].sort((a, b) => a.userCount - b.userCount);
  }

  async getAvailableVoiceChannels(clanId: string) {
    const channels = await this.getVoiceChannelsByOccupancy(clanId);
    return channels
      .filter((channel) => channel.userCount === 0)
      .map(({ id, name }) => ({ id, name }));
  }

  async pickVoiceRoomForLesson(clanId: string): Promise<{ id: string; name: string } | undefined> {
    const channels = await this.getVoiceChannelsByOccupancy(clanId);
    const best = channels[0];
    return best ? { id: best.id, name: best.name } : undefined;
  }
}
