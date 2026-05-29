import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUserPayload } from '../auth/interfaces/auth.interfaces';
import type { LessonComplaintCreatedResult, StudentLessonComplaintItem } from '@mezon-tutors/shared';
import { LessonComplaintService } from './lesson-complaint.service';
import { CreateLessonComplaintDto } from './dto/create-lesson-complaint.dto';

@Controller('lesson-complaints')
@ApiTags('Lesson complaints')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LessonComplaintController {
  constructor(private readonly lessonComplaintService: LessonComplaintService) {}

  @Get('my')
  async listMine(@Req() req: Request): Promise<StudentLessonComplaintItem[]> {
    const user = req.user as AuthUserPayload;
    return this.lessonComplaintService.listMine(user.sub);
  }

  @Post()
  async create(
    @Req() req: Request,
    @Body() body: CreateLessonComplaintDto
  ): Promise<LessonComplaintCreatedResult> {
    const user = req.user as AuthUserPayload;
    return this.lessonComplaintService.createComplaint(user.sub, body);
  }
}
