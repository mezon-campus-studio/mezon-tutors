import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUserPayload } from '../auth/interfaces/auth.interfaces';
import {
  GetDmChannelQueryDto,
  ResolveDmChannelDto,
  UpsertDmChannelDto,
} from './dto/dm-channel.dto';
import { DmChannelService } from './dm-channel.service';

@Controller('dm-channels')
@ApiTags('DM Channels')
@UseGuards(JwtAuthGuard)
export class DmChannelController {
  constructor(private readonly dmChannelService: DmChannelService) {}

  @Get('my')
  async getMyDmChannels(@Req() req: Request) {
    const user = req.user as AuthUserPayload;
    return this.dmChannelService.getMyChannels(user.sub);
  }

  @Get()
  async getDmChannel(@Req() req: Request, @Query() query: GetDmChannelQueryDto) {
    const user = req.user as AuthUserPayload;
    return this.dmChannelService.getChannel(user.sub, query);
  }

  @Post()
  async createDmChannel(@Req() req: Request, @Body() dto: UpsertDmChannelDto) {
    const user = req.user as AuthUserPayload;
    return this.dmChannelService.createChannel(user.sub, dto);
  }

  @Post('resolve')
  async resolveDmChannel(@Req() req: Request, @Body() dto: ResolveDmChannelDto) {
    const user = req.user as AuthUserPayload;
    return this.dmChannelService.resolveExistingChannel(user.sub, dto);
  }
}
