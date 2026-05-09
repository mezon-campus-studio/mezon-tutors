import { Injectable } from '@nestjs/common';
import { MezonBotService } from './modules/mezon-bot/mezon-bot.service';


@Injectable()
export class AppService {
    constructor(
        private readonly mezonBotService: MezonBotService,
    ) {}

    async onModuleInit() {
        this.mezonBotService.onModuleInit();
    }
}
