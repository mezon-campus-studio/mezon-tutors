import { Controller, Get, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { MyScheduleService } from './my-schedule.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Request } from 'express';
import type { AuthUserPayload } from '../auth/interfaces/auth.interfaces';
import dayjs = require('dayjs');

@Controller('my-schedule')
export class MyScheduleController {
  constructor(private readonly myScheduleService: MyScheduleService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getMySchedule(
    @Req() req: Request,
    @Query('week_start_date') weekStartDate?: string,
    @Query('timezone') timezone?: string
  ) {
    if (weekStartDate) {
      const parsed = dayjs(weekStartDate);
      if (!parsed.isValid()) {
        throw new BadRequestException('Invalid week_start_date format. Expected YYYY-MM-DD');
      }
    }

    const user = req.user as AuthUserPayload;
    return this.myScheduleService.getMySchedule(user.mezonUserId, weekStartDate, timezone);
  }
}
