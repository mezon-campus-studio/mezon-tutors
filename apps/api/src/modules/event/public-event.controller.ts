import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { EventDetailDto, EventListItemDto } from '@mezon-tutors/shared';
import { EventService } from './event.service';

@Controller('events')
@ApiTags('Events')
export class PublicEventController {
  constructor(private readonly eventService: EventService) {}

  @Get()
  @ApiOperation({ summary: 'List published events' })
  listPublished(): Promise<EventListItemDto[]> {
    return this.eventService.listPublished();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get published event by slug' })
  getBySlug(@Param('slug') slug: string): Promise<EventDetailDto> {
    return this.eventService.getPublishedBySlug(slug);
  }
}
