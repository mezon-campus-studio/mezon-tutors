import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { TutorApplicationService } from './tutor-application.service';
import { CreateAdminNoteDto } from './dto/create-admin-note.dto';
import type {
  AdminLessonChangeHistoryItem,
  FullTutorApplication,
  TutorAdminNote,
  TutorApplicationMetrics,
} from '@mezon-tutors/shared';
import { TutorProfile } from '@mezon-tutors/db';

@Controller('admin')
@ApiTags('Admin - Tutor applications')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class TutorApplicationController {
  constructor(private readonly tutorApplicationService: TutorApplicationService) {}

  @Get('tutor-applications')
  async getList(): Promise<TutorProfile[]> {
    return this.tutorApplicationService.listApplications();
  }

  @Get('tutor-applications/metrics')
  async getMetrics(): Promise<TutorApplicationMetrics> {
    return this.tutorApplicationService.getMetrics();
  }

  @Post('tutor-applications/:id/approve')
  async approve(@Param('id') id: string) {
    return this.tutorApplicationService.approve(id);
  }

  @Post('tutor-applications/:id/reject')
  async reject(@Param('id') id: string) {
    return this.tutorApplicationService.reject(id);
  }

  @Get('tutor-profiles/:id')
  async getTutorProfile(@Param('id') id: string): Promise<FullTutorApplication> {
    return this.tutorApplicationService.getTutorProfile(id);
  }

  @Get('tutor-profiles/:id/lesson-change-history')
  async getLessonChangeHistory(
    @Param('id') id: string
  ): Promise<AdminLessonChangeHistoryItem[]> {
    return this.tutorApplicationService.getLessonChangeHistory(id);
  }

  @Post('tutor-admin-notes')
  async createAdminNote(@Body() dto: CreateAdminNoteDto): Promise<TutorAdminNote> {
    return this.tutorApplicationService.createAdminNote(dto);
  }
}
