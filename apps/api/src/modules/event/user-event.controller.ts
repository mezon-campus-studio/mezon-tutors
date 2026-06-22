import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { EventDetailDto, EventListItemDto } from '@mezon-tutors/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUserPayload } from '../auth/interfaces/auth.interfaces';
import { CreateEventDto } from './dto/create-event.dto';
import { EventService } from './event.service';

@Controller('events')
@ApiTags('Events')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserEventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a new event for admin review' })
  create(
    @Req() req: Request,
    @Body() body: CreateEventDto,
  ): Promise<EventDetailDto> {
    const user = req.user as AuthUserPayload;
    return this.eventService.createPending(user.sub, body);
  }

  @Get('submissions/mine')
  @ApiOperation({ summary: 'List events submitted by current user' })
  listMine(@Req() req: Request): Promise<EventListItemDto[]> {
    const user = req.user as AuthUserPayload;
    return this.eventService.listMySubmissions(user.sub);
  }

  @Get('submissions/mine/:id')
  @ApiOperation({ summary: 'Get one event submission owned by current user' })
  getMineById(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<EventDetailDto> {
    const user = req.user as AuthUserPayload;
    return this.eventService.getMySubmissionById(user.sub, id);
  }

  @Put('submissions/mine/:id')
  @ApiOperation({ summary: 'Update an owned event submission (pending or rejected)' })
  updateMine(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: CreateEventDto,
  ): Promise<EventDetailDto> {
    const user = req.user as AuthUserPayload;
    return this.eventService.updateMySubmission(user.sub, id, body);
  }
}
