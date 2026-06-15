import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { SupportAdminContact } from '@mezon-tutors/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SupportService } from './support.service';

@Controller('support')
@ApiTags('Support')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('admin-contact')
  getAdminContact(): Promise<SupportAdminContact> {
    return this.supportService.getAdminContact();
  }

  @Get('bot-contact')
  getBotContact(): Promise<SupportAdminContact> {
    return this.supportService.getBotContact();
  }
}
