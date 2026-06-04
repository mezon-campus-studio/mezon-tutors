import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUserPayload } from '../auth/interfaces/auth.interfaces';
import type {
  TutorConfirmLessonComplaintResult,
  TutorLessonComplaintListItem,
  TutorRejectLessonComplaintResult,
} from '@mezon-tutors/shared';
import { LessonComplaintService } from './lesson-complaint.service';
import { RejectTutorLessonComplaintDto } from './dto/reject-tutor-lesson-complaint.dto';

@Controller('tutor/lesson-complaints')
@ApiTags('Tutor - Lesson complaints')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TutorLessonComplaintController {
  constructor(private readonly lessonComplaintService: LessonComplaintService) {}

  @Get()
  async list(@Req() req: Request): Promise<TutorLessonComplaintListItem[]> {
    const user = req.user as AuthUserPayload;
    return this.lessonComplaintService.listForTutor(user.sub);
  }

  @Post(':id/confirm')
  async confirm(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<TutorConfirmLessonComplaintResult> {
    const user = req.user as AuthUserPayload;
    return this.lessonComplaintService.confirmComplaintByTutor(user.sub, id);
  }

  @Post(':id/reject')
  async reject(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectTutorLessonComplaintDto
  ): Promise<TutorRejectLessonComplaintResult> {
    const user = req.user as AuthUserPayload;
    return this.lessonComplaintService.rejectComplaintByTutor(user.sub, id, dto);
  }
}
