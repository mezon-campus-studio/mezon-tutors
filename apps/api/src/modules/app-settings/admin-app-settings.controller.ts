import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { AppSettings } from '@mezon-tutors/shared';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@mezon-tutors/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUserPayload } from '../auth/interfaces/auth.interfaces';
import { AppSettingsService } from './app-settings.service';
import { UpdateAppSettingsDto } from './dto/update-app-settings.dto';

@Controller('admin')
@ApiTags('Admin - App settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AdminAppSettingsController {
  constructor(private readonly appSettingsService: AppSettingsService) {}

  @Get('app-settings')
  getSettings(): Promise<AppSettings> {
    return this.appSettingsService.getSettings();
  }

  @Put('app-settings')
  updateSettings(
    @Req() req: Request,
    @Body() body: UpdateAppSettingsDto
  ): Promise<AppSettings> {
    const user = req.user as AuthUserPayload;
    return this.appSettingsService.updateSettings(user.sub, body);
  }
}
