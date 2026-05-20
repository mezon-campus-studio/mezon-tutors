import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUserPayload } from '../auth/interfaces/auth.interfaces';
import { MyLessonsService } from './my-lessons.service';

@Controller('my-lessons')
@ApiTags('My Lessons')
@UseGuards(JwtAuthGuard)
export class MyLessonsController {
  constructor(private readonly myLessonsService: MyLessonsService) {}

  @Get()
  async getOverview(
    @Req() req: Request,
    @Query('week_start_date') weekStartDate?: string,
    @Query('timezone') timezone?: string
  ) {
    const user = req.user as AuthUserPayload;
    return this.myLessonsService.getOverview(user.mezonUserId, weekStartDate, timezone);
  }
}
