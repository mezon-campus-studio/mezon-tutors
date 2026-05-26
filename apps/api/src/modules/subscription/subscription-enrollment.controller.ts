import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { AuthUserPayload } from '../auth/interfaces/auth.interfaces';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type {
  SubscriptionEligibilityDto,
  SubscriptionEnrollmentDetailDto,
  SubscriptionEnrollmentDto,
  SubscriptionSlotCancelResult,
  TutorSubscriptionWeekOccurrenceDto,
} from '@mezon-tutors/shared';
import { SubscriptionService } from './subscription.service';
import { getRequestClientIp } from '../../common/utils/request-ip.util';
import { CreateSubscriptionEnrollmentBodyDto } from './dto/create-subscription-enrollment.dto';
import { CancelSubscriptionSlotBodyDto } from './dto/cancel-subscription-slot.dto';

@Controller('subscription-enrollments')
@ApiTags('Subscription enrollments')
export class SubscriptionEnrollmentController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @UseGuards(JwtAuthGuard)
  @Get('eligibility')
  async eligibility(
    @Req() req: Request,
    @Query('tutorId', ParseUUIDPipe) tutorId: string
  ): Promise<SubscriptionEligibilityDto> {
    const user = req.user as AuthUserPayload;
    return this.subscriptionService.getEligibility(user.sub, tutorId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Req() req: Request,
    @Body() body: CreateSubscriptionEnrollmentBodyDto
  ): Promise<SubscriptionEnrollmentDto> {
    const user = req.user as AuthUserPayload;
    return this.subscriptionService.createEnrollment(user.sub, body, getRequestClientIp(req));
  }

  @UseGuards(JwtAuthGuard)
  @Get('tutor/week-occurrences')
  async tutorWeekOccurrences(
    @Req() req: Request,
    @Query('week_start_date') weekStartDate: string,
    @Query('timezone') timezone?: string
  ): Promise<TutorSubscriptionWeekOccurrenceDto[]> {
    const v = weekStartDate?.trim() ?? '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      throw new BadRequestException('Invalid week_start_date');
    }
    const user = req.user as AuthUserPayload;
    return this.subscriptionService.listTutorWeekOccurrences(user.sub, v, timezone);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/slots/:slotIndex/cancel')
  async cancelSlot(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('slotIndex', ParseIntPipe) slotIndex: number,
    @Body() body: CancelSubscriptionSlotBodyDto
  ): Promise<SubscriptionSlotCancelResult> {
    const user = req.user as AuthUserPayload;
    return this.subscriptionService.cancelStudentSubscriptionSlot(
      user.sub,
      id,
      slotIndex,
      body
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getOne(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<SubscriptionEnrollmentDetailDto> {
    const user = req.user as AuthUserPayload;
    return this.subscriptionService.getEnrollmentDetail(user.sub, id);
  }
}
