import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Put, Query, Req, UseGuards, NotFoundException } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import type { AuthUserPayload } from '../auth/interfaces/auth.interfaces'
import type {
  PaginatedResponse,
  SavedTutorDto,
  SubmitTutorProfileDto,
  UpdateMyTutorProfileDto,
  UpdateTutorSetupChecklistDto,
  TutorAboutDto,
  TutorSetupChecklistDto,
  TutorScheduleDto,
  TutorReviewsDto,
  TutorResourcesDto,
  TutorResumeDto,
  VerifiedTutorProfileDto,
} from '@mezon-tutors/shared'
import { VerificationStatus } from '@mezon-tutors/db'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { TutorProfileService } from './tutor-profile.service'
import { TutorSetupChecklistService } from './tutor-setup-checklist.service'
import { VerifiedTutorQueryDto } from './dto/verified-tutor-query.dto'
import { UpdateAvailabilityDto } from './dto/update-availability.dto'
import { UpdateMyTutorProfileBodyDto } from './dto/update-my-tutor-profile.dto'
import { UpdateTutorSetupChecklistBodyDto } from './dto/update-tutor-setup-checklist.dto'
import { PrismaService } from '../../prisma/prisma.service'

@Controller('tutor-profiles')
@ApiTags('Tutor Profile')
export class TutorProfileController {
  constructor(
    private readonly tutorProfileService: TutorProfileService,
    private readonly tutorSetupChecklistService: TutorSetupChecklistService,
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
    await this.tutorProfileService.upsertByUserId(user.sub, body)
    return { success: true }
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyProfile(@Req() req: Request) {
    const user = req.user as AuthUserPayload
    return this.tutorProfileService.getMyProfile(user.sub)
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  async putMyProfile(@Req() req: Request, @Body() body: UpdateMyTutorProfileBodyDto) {
    const user = req.user as AuthUserPayload
    await this.tutorProfileService.putMyProfileByUserId(
      user.sub,
      body as UpdateMyTutorProfileDto
    )
    return { success: true }
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/setup-checklist')
  async getMySetupChecklist(@Req() req: Request): Promise<TutorSetupChecklistDto> {
    const user = req.user as AuthUserPayload
    return this.tutorSetupChecklistService.getByUserId(user.sub)
  }

  @UseGuards(JwtAuthGuard)
  @Put('me/setup-checklist')
  async patchMySetupChecklist(
    @Req() req: Request,
    @Body() body: UpdateTutorSetupChecklistBodyDto,
  ): Promise<TutorSetupChecklistDto> {
    const user = req.user as AuthUserPayload
    return this.tutorSetupChecklistService.updateByUserId(
      user.sub,
      body as UpdateTutorSetupChecklistDto,
    )
  }

  @Get('verified')
  async getVerifiedTutors(
    @Req() req: Request,
    @Query() query: VerifiedTutorQueryDto
  ): Promise<PaginatedResponse<VerifiedTutorProfileDto>> {
    const user = req.user as AuthUserPayload | undefined
    return this.tutorProfileService.getVerifiedTutors(query, user?.sub)
  }

  @UseGuards(JwtAuthGuard)
  @Get('saved')
  async getSavedTutors(@Req() req: Request): Promise<SavedTutorDto[]> {
    const user = req.user as AuthUserPayload
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException('Only students can save tutors')
    }
    return this.tutorProfileService.getSavedTutors(user.sub)
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

  @Get(':id/resume')
  async getVerifiedTutorResume(@Param('id') id: string): Promise<TutorResumeDto> {
    await this.validateVerifiedTutor(id)
    return this.tutorProfileService.getVerifiedTutorResume(id)
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/save')
  async saveTutor(@Req() req: Request, @Param('id') id: string) {
    await this.validateVerifiedTutor(id)
    const user = req.user as AuthUserPayload
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException('Only students can save tutors')
    }
    return this.tutorProfileService.saveTutor(user.sub, id)
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/save')
  async unsaveTutor(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as AuthUserPayload
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException('Only students can save tutors')
    }
    await this.tutorProfileService.unsaveTutor(user.sub, id)
    return { success: true }
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
