import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminAppSettingsController } from './admin-app-settings.controller';
import { PublicAppSettingsController } from './public-app-settings.controller';
import { AppSettingsService } from './app-settings.service';

@Global()
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminAppSettingsController, PublicAppSettingsController],
  providers: [AppSettingsService],
  exports: [AppSettingsService],
})
export class AppSettingsModule {}
