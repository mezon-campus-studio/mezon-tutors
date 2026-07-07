import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type {
  EventDetailDto,
  EventListItemDto,
  EventMetricsDto,
  EventPublishStatusFilter,
} from '@mezon-tutors/shared';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@mezon-tutors/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUserPayload } from '../auth/interfaces/auth.interfaces';
import { RejectEventDto } from './dto/reject-event.dto';
import { EventService } from './event.service';

@Controller('admin')
@ApiTags('Admin - Events')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.CTV)
@ApiBearerAuth()
export class AdminEventController {
  constructor(private readonly eventService: EventService) {}

  @Get('events')
  @ApiOperation({ summary: 'List all events for admin review' })
  list(
    @Query('status') status?: EventPublishStatusFilter,
  ): Promise<EventListItemDto[]> {
    return this.eventService.listAdmin(status);
  }

  @Get('events/metrics')
  @ApiOperation({ summary: 'Event submission metrics' })
  metrics(): Promise<EventMetricsDto> {
    return this.eventService.getMetrics();
  }

  @Get('events/:id')
  @ApiOperation({ summary: 'Get event detail for admin review' })
  getById(@Param('id') id: string): Promise<EventDetailDto> {
    return this.eventService.getAdminById(id);
  }

  @Post('events/:id/publish')
  @ApiOperation({ summary: 'Publish event to end users' })
  publish(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<EventDetailDto> {
    const user = req.user as AuthUserPayload;
    return this.eventService.publish(id, user.sub);
  }

  @Post('events/:id/reject')
  @ApiOperation({ summary: 'Reject event submission' })
  reject(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: RejectEventDto,
  ): Promise<EventDetailDto> {
    const user = req.user as AuthUserPayload;
    return this.eventService.reject(id, user.sub, body.reason);
  }

  @Post('events/:id/close')
  @ApiOperation({ summary: 'Close a published event (hide from public pages)' })
  close(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<EventDetailDto> {
    const user = req.user as AuthUserPayload;
    return this.eventService.close(id, user.sub);
  }

  @Post('events/:id/approve-update')
  @ApiOperation({ summary: 'Approve a pending update on a published event' })
  approveUpdate(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<EventDetailDto> {
    const user = req.user as AuthUserPayload;
    return this.eventService.approveEventUpdate(id, user.sub);
  }

  @Post('events/:id/reject-update')
  @ApiOperation({ summary: 'Reject a pending update on a published event' })
  rejectUpdate(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: RejectEventDto,
  ): Promise<EventDetailDto> {
    const user = req.user as AuthUserPayload;
    return this.eventService.rejectEventUpdate(id, user.sub, body.reason);
  }
}
