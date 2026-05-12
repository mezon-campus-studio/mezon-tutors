import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUserPayload } from '../auth/interfaces/auth.interfaces';
import { GetDmChannelQueryDto, UpsertDmChannelDto } from './dto/dm-channel.dto';
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
  async getDmChannel(@Query() query: GetDmChannelQueryDto) {
    return this.dmChannelService.getChannel(query);
  }

  @Post()
  async createDmChannel(@Body() dto: UpsertDmChannelDto) {
    return this.dmChannelService.createChannel(dto);
  }
}
