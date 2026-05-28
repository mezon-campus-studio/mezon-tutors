import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import type { AuthUserPayload } from '../auth/interfaces/auth.interfaces';
import type {
  AdminLessonComplaintListItem,
  AdminLessonComplaintMetrics,
  ReviewLessonComplaintResult,
} from '@mezon-tutors/shared';
import { LessonComplaintService } from './lesson-complaint.service';
import { ListLessonComplaintsQueryDto } from './dto/list-lesson-complaints-query.dto';
import { ReviewLessonComplaintDto } from './dto/review-lesson-complaint.dto';

@Controller('admin')
@ApiTags('Admin - Lesson complaints')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminLessonComplaintController {
  constructor(private readonly lessonComplaintService: LessonComplaintService) {}

  @Get('lesson-complaints')
  async list(
    @Query() query: ListLessonComplaintsQueryDto
  ): Promise<AdminLessonComplaintListItem[]> {
    return this.lessonComplaintService.listForAdmin(query.status);
  }

  @Get('lesson-complaints/metrics')
  async metrics(): Promise<AdminLessonComplaintMetrics> {
    return this.lessonComplaintService.getAdminMetrics();
  }

  @Post('lesson-complaints/:id/approve')
  async approve(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReviewLessonComplaintDto
  ): Promise<ReviewLessonComplaintResult> {
    const user = req.user as AuthUserPayload;
    return this.lessonComplaintService.approveComplaint(user.sub, id, body);
  }

  @Post('lesson-complaints/:id/reject')
  async reject(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReviewLessonComplaintDto
  ): Promise<ReviewLessonComplaintResult> {
    const user = req.user as AuthUserPayload;
    return this.lessonComplaintService.rejectComplaint(user.sub, id, body);
  }
}
