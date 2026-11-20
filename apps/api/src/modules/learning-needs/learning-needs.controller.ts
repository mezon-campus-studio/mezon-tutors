import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUserPayload } from '../auth/interfaces/auth.interfaces';
import {
  AssociateLearningNeedsChannelDto,
  RecordLearningNeedsSyncFailureDto,
  SaveLearningNeedsDraftDto,
  ShareLearningNeedsDto,
} from './dto/learning-needs.dto';
import { LearningNeedsService } from './learning-needs.service';

@Controller('learning-needs')
@ApiTags('Learning Needs')
@UseGuards(JwtAuthGuard)
export class LearningNeedsController {
  constructor(private readonly learningNeedsService: LearningNeedsService) {}

  @Get('bookings/:bookingId')
  getForBooking(@Req() req: Request, @Param('bookingId', ParseUUIDPipe) bookingId: string) {
    const user = req.user as AuthUserPayload;
    return this.learningNeedsService.getForBooking(user.sub, bookingId);
  }

  @Put('bookings/:bookingId/draft')
  saveDraft(
    @Req() req: Request,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Body() body: SaveLearningNeedsDraftDto
  ) {
    const user = req.user as AuthUserPayload;
    return this.learningNeedsService.saveDraft(user.sub, bookingId, body);
  }

  @Post('bookings/:bookingId/share')
  share(
    @Req() req: Request,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Body() body: ShareLearningNeedsDto
  ) {
    const user = req.user as AuthUserPayload;
    return this.learningNeedsService.share(user.sub, bookingId, body.expectedDraftRevision);
  }

  @Get('channels/:channelId/current')
  getCurrentForChannel(@Req() req: Request, @Param('channelId') channelId: string) {
    const user = req.user as AuthUserPayload;
    return this.learningNeedsService.getCurrentForChannel(user.sub, channelId);
  }

  @Post(':id/channel-association')
  associateChannel(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AssociateLearningNeedsChannelDto
  ) {
    const user = req.user as AuthUserPayload;
    return this.learningNeedsService.associateChannel(user.sub, id, body);
  }

  @Post(':id/sync-failure')
  recordSyncFailure(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RecordLearningNeedsSyncFailureDto
  ) {
    const user = req.user as AuthUserPayload;
    return this.learningNeedsService.recordSyncFailure(user.sub, id, body.error);
  }
}
