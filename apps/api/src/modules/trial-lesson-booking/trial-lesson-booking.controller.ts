import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { ETrialLessonStatus } from '@mezon-tutors/db'
import type { PaginatedResponse } from '@mezon-tutors/shared'
import type { Request } from 'express'
import type { AuthUserPayload } from '../auth/interfaces/auth.interfaces'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreateTrialLessonBookingDto } from './dto/create-trial-lesson-booking.dto'
import { RescheduleTrialLessonBookingDto } from './dto/reschedule-trial-lesson-booking.dto'
import { GetMyTrialLessonBookingsDto } from './dto/get-my-trial-lesson-bookings.dto'
import { getRequestClientIp } from '../../common/utils/request-ip.util'
import { TrialLessonBookingService } from './trial-lesson-booking.service'
import type { TutorTrialLessonBookingRequestDto } from './dto/tutor-trial-lesson-booking-request.dto'

@Controller('trial-lesson-bookings')
@ApiTags('Trial Lesson Booking')
export class TrialLessonBookingController {
  constructor(private readonly trialLessonBookingService: TrialLessonBookingService) {}

  @Get('occupied')
  async getOccupiedByTutorAndDate(
    @Query('tutorId') tutorId: string,
    @Query('date') date: string,
    @Query('timezone') timezone: string,
    @Query('excludeBookingId') excludeBookingId?: string
  ) {
    return this.trialLessonBookingService.getAcceptedByTutorAndDate(
      tutorId,
      date,
      timezone,
      excludeBookingId
    )
  }

  @UseGuards(JwtAuthGuard)
  @Get('already-booked')
  async getAlreadyBookedStatus(@Req() req: Request, @Query('tutorId') tutorId: string) {
    const user = req.user as AuthUserPayload
    return this.trialLessonBookingService.hasStudentBookedTutor(user.sub, tutorId)
  }

  @UseGuards(JwtAuthGuard)
  @Get('current-booking')
  async getCurrentBooking(@Req() req: Request, @Query('tutorId') tutorId: string) {
    const user = req.user as AuthUserPayload
    return this.trialLessonBookingService.getCurrentStudentTutorBooking(user.sub, tutorId)
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: Request, @Body() body: CreateTrialLessonBookingDto) {
    const user = req.user as AuthUserPayload
    return this.trialLessonBookingService.createTrialLessonBooking(
      user.sub,
      body,
      getRequestClientIp(req)
    )
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-requests')
  async getMyRequests(
    @Req() req: Request,
    @Query() query: GetMyTrialLessonBookingsDto
  ): Promise<PaginatedResponse<TutorTrialLessonBookingRequestDto>> {
    const user = req.user as AuthUserPayload

    const statusIn = query.statusIn?.length ? query.statusIn : undefined

    return this.trialLessonBookingService.getTutorBookingRequests(user.sub, {
      status: statusIn?.length ? undefined : query.status,
      statusIn,
      orderBy: statusIn?.length ? 'startAt' : undefined,
      page: query.page,
      limit: query.limit,
    })
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getBookingDetail(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const user = req.user as AuthUserPayload
    return this.trialLessonBookingService.getStudentBookingDetail(user.sub, id)
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/reschedule')
  async rescheduleBooking(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RescheduleTrialLessonBookingDto,
    @Query('timezone') timezone?: string
  ) {
    const user = req.user as AuthUserPayload
    return this.trialLessonBookingService.rescheduleTrialLessonBooking(
      user.sub,
      id,
      body,
      timezone?.trim() || 'UTC'
    )
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/cancel')
  async cancelBooking(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string; message?: string }
  ) {
    const user = req.user as AuthUserPayload
    const result = await this.trialLessonBookingService.cancelTrialLessonBooking(user.sub, id, body)
    return { success: true, refunded: result.refunded }
  }

}
