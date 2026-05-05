import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards, NotFoundException } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import type { AuthUserPayload } from '../auth/interfaces/auth.interfaces'
import type {
  PaginatedResponse,
  SubmitTutorProfileDto,
  TutorAboutDto,
  TutorScheduleDto,
  TutorReviewsDto,
  TutorResourcesDto,
  VerifiedTutorProfileDto,
} from '@mezon-tutors/shared'
import { VerificationStatus } from '@mezon-tutors/db'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { TutorProfileService } from './tutor-profile.service'
import { VerifiedTutorQueryDto } from './dto/verified-tutor-query.dto'
import { UpdateAvailabilityDto } from './dto/update-availability.dto'
import { PrismaService } from '../../prisma/prisma.service'

@Controller('tutor-profiles')
@ApiTags('Tutor Profile')
export class TutorProfileController {
  constructor(
    private readonly tutorProfileService: TutorProfileService,
    private readonly prisma: PrismaService
  ) {}

  private async validateVerifiedTutor(id: string): Promise<void> {
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { id },
      select: { verificationStatus: true },
    })

    if (!tutor || tutor.verificationStatus !== VerificationStatus.APPROVED) {
      throw new NotFoundException(`Verified tutor with ID ${id} not found`)
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async HandleSubmitTutorProfile(@Req() req: Request, @Body() body: SubmitTutorProfileDto) {
    const user = req.user as AuthUserPayload
    await this.tutorProfileService.createByUserId(user.sub, body)
    return { success: true }
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/status')
  async getMyTutorProfileStatus(@Req() req: Request) {
    const user = req.user as AuthUserPayload
    return this.tutorProfileService.getMyTutorProfileStatus(user.sub)
  }

  @Get('verified')
  async getVerifiedTutors(
    @Query() query: VerifiedTutorQueryDto
  ): Promise<PaginatedResponse<VerifiedTutorProfileDto>> {
    return this.tutorProfileService.getVerifiedTutors(query)
  }

  @Get(':id/about')
  async getVerifiedTutorAbout(@Param('id') id: string): Promise<TutorAboutDto> {
    await this.validateVerifiedTutor(id)
    return this.tutorProfileService.getVerifiedTutorAbout(id)
  }

  @Get(':id/schedule')
  async getVerifiedTutorSchedule(@Param('id') id: string): Promise<TutorScheduleDto> {
    await this.validateVerifiedTutor(id)
    return this.tutorProfileService.getVerifiedTutorSchedule(id)
  }

  @Get(':id/reviews')
  async getVerifiedTutorReviews(@Param('id') id: string): Promise<TutorReviewsDto> {
    await this.validateVerifiedTutor(id)
    return this.tutorProfileService.getVerifiedTutorReviews(id)
  }

  @Get(':id/resources')
  async getVerifiedTutorResources(@Param('id') id: string): Promise<TutorResourcesDto> {
    await this.validateVerifiedTutor(id)
    return this.tutorProfileService.getVerifiedTutorResources(id)
  }

  @UseGuards(JwtAuthGuard)
  @Get('availability')
  async getAvailability(@Req() req: Request) {
    const user = req.user as AuthUserPayload
    const tutorProfile = await this.prisma.tutorProfile.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    })

    if (!tutorProfile) {
      throw new NotFoundException('Tutor profile not found')
    }

    const availability = await this.prisma.tutorAvailability.findMany({
      where: { tutorId: tutorProfile.id, isActive: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    })

    return {
      availability: availability.map((slot) => ({
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
      })),
    }
  }

  @UseGuards(JwtAuthGuard)
  @Put('availability')
  async updateAvailability(@Req() req: Request, @Body() body: UpdateAvailabilityDto) {
    const user = req.user as AuthUserPayload
    const tutorProfile = await this.prisma.tutorProfile.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    })

    if (!tutorProfile) {
      throw new NotFoundException('Tutor profile not found')
    }

    await this.tutorProfileService.upsertTutorAvailabilitySlotByUserId(
      tutorProfile.id,
      body.availability
    )

    return { success: true }
  }
}
