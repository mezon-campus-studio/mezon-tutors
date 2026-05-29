import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PublicAppSettings } from '@mezon-tutors/shared';
import { AppSettingsService } from './app-settings.service';

@Controller('app-settings')
@ApiTags('App settings')
export class PublicAppSettingsController {
  constructor(private readonly appSettingsService: AppSettingsService) {}

  @Get('public')
  @ApiOperation({ summary: 'Public app settings (platform rules)' })
  getPublicSettings(): Promise<PublicAppSettings> {
    return this.appSettingsService.getPublicSettings();
  }
}
