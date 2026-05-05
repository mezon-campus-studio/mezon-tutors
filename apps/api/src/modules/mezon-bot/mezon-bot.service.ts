import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../shared/services/app-config.service';
import { ChannelMessageContent, MezonClient } from 'mezon-sdk';
import { User as MezonUser } from 'mezon-sdk/dist/cjs/mezon-client/structures/User';

@Injectable()
export class MezonBotService {
  private client: MezonClient;

  constructor(private readonly appConfig: AppConfigService) {
    if (!this.isConfigured()) {
      throw new Error('MezonBot is not configured');
    }
    
    this.client = new MezonClient({
      botId: this.appConfig.mezonBotConfig.clientId,
      token: this.appConfig.mezonBotConfig.clientSecret,
    });
  }


  async onModuleInit() {
    try {
      await this.client.login();
    } catch (error) {
      console.error('Error initializing MezonBotService:', error);
    }
  }

  isConfigured() {
    const config = this.appConfig.mezonBotConfig;
    return Boolean(config.clientId && config.clientSecret);
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
}
