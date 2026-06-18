import { Controller, Get, Post, Patch, Body, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StudyGroupService } from './study-group.service';
import type { AuthUserPayload } from '../auth/interfaces/auth.interfaces';
import type { Request } from 'express';

@Controller('study-groups')
export class StudyGroupController {
  constructor(private readonly studyGroupService: StudyGroupService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Req() req: Request) {
    const user = req.user as AuthUserPayload;
    return this.studyGroupService.findAll(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: Request, @Body('name') name: string) {
    const user = req.user as AuthUserPayload;
    return this.studyGroupService.create(user.sub, name);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Req() req: Request, @Param('id') id: string, @Body('name') name: string) {
    const user = req.user as AuthUserPayload;
    return this.studyGroupService.updateName(user.sub, id, name);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/group-chat-channel')
  async updateGroupChatChannel(
    @Req() req: Request,
    @Param('id') id: string,
    @Body('channelId') channelId: string,
  ) {
    const user = req.user as AuthUserPayload;
    return this.studyGroupService.updateGroupChatChannel(user.sub, id, channelId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.studyGroupService.findOne(id);
  }

  @Get('invite/:inviteId')
  async findByInvite(@Param('inviteId') inviteId: string) {
    return this.studyGroupService.findByInvite(inviteId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('join/:inviteId')
  async join(@Req() req: Request, @Param('inviteId') inviteId: string) {
    const user = req.user as AuthUserPayload;
    return this.studyGroupService.join(user.sub, inviteId);
  }
}
