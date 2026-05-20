import { Global, Module } from '@nestjs/common';
import { AppConfigService } from './services/app-config.service';
import { EmailService } from './services/email.service';
import { MezonMessageService } from './services/mezon-message';

@Global()
@Module({
  providers: [AppConfigService, EmailService, MezonMessageService],
  exports: [AppConfigService, EmailService, MezonMessageService],
})
export class SharedModule {}
