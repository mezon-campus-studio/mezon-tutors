import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LearningLogService } from './learning-log.service';
import { LogLearningDto } from './dto/log-learning.dto';
import type { Request } from 'express';
import type { AuthUserPayload } from '../auth/interfaces/auth.interfaces';

@Controller('learning-logs')
@UseGuards(JwtAuthGuard)
export class LearningLogController {
  constructor(private readonly learningLogService: LearningLogService) {}

  @Post()
  async logLearning(
    @Req() req: Request,
    @Body() dto: LogLearningDto,
  ) {
    const user = req.user as AuthUserPayload;
    return this.learningLogService.logLearning(user.sub, dto);
  }

  @Get('heatmap')
  async getLearningHeatmap(
    @Req() req: Request,
    @Query('months') months?: string,
  ) {
    const user = req.user as AuthUserPayload;
    const numMonths = months ? parseInt(months, 10) : 7;
    return this.learningLogService.getLearningHeatmap(user.sub, numMonths);
  }
}
