import { Controller, Get, Post, Param, Body, UseGuards, Res, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { TutorApplicationService } from './tutor-application.service';
import { CreateAdminNoteDto } from './dto/create-admin-note.dto';
import { TutorApplicationDecisionDto } from './dto/tutor-application-decision.dto';
import {
  buildContentDispositionHeader,
  type AdminLessonChangeHistoryItem,
  type FullTutorApplication,
  type SecurePrivateViewLink,
  type TutorAdminNote,
  type TutorApplicationMetrics,
} from '@mezon-tutors/shared';
import { TutorProfile } from '@mezon-tutors/db';
import type { Response } from 'express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('admin')
@ApiTags('Admin - Tutor applications')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class TutorApplicationController {
  constructor(
    private readonly tutorApplicationService: TutorApplicationService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly prisma: PrismaService
  ) {}

  @Get('tutor-applications')
  async getList(): Promise<TutorProfile[]> {
    return this.tutorApplicationService.listApplications();
  }

  @Get('tutor-applications/metrics')
  async getMetrics(): Promise<TutorApplicationMetrics> {
    return this.tutorApplicationService.getMetrics();
  }

  @Post('tutor-applications/:id/approve')
  async approve(@Param('id') id: string, @Body() dto: TutorApplicationDecisionDto) {
    return this.tutorApplicationService.approve(id, dto.note);
  }

  @Post('tutor-applications/:id/reject')
  async reject(@Param('id') id: string, @Body() dto: TutorApplicationDecisionDto) {
    return this.tutorApplicationService.reject(id, dto.note);
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

  @Get('tutor-profiles/:tutorId/identity-verification/view-link')
  async getIdentityVerificationViewLink(
    @Param('tutorId') tutorId: string
  ): Promise<SecurePrivateViewLink> {
    const verification = await this.prisma.identityVerification.findUnique({
      where: { tutorId },
      select: { fileKey: true },
    });
    if (!verification?.fileKey) {
      throw new NotFoundException('Identity verification document not found');
    }
    return this.cloudinaryService.createPrivateViewLink(verification.fileKey, {
      preferredFileName: 'identity-document',
    });
  }

  @Get('tutor-profiles/:tutorId/documents/:documentId/view-link')
  async getProfessionalDocumentViewLink(
    @Param('tutorId') tutorId: string,
    @Param('documentId') documentId: string
  ): Promise<SecurePrivateViewLink> {
    const doc = await this.prisma.professionalDocument.findFirst({
      where: { id: documentId, tutorId },
      select: { fileKey: true, name: true },
    });
    if (!doc?.fileKey) {
      throw new NotFoundException('Professional document not found');
    }
    return this.cloudinaryService.createPrivateViewLink(doc.fileKey, {
      preferredFileName: doc.name,
    });
  }

  @Get('tutor-profiles/:tutorId/identity-verification/image')
  async proxyIdentityVerificationImage(
    @Param('tutorId') tutorId: string,
    @Res() res: Response
  ): Promise<void> {
    const verification = await this.prisma.identityVerification.findUnique({
      where: { tutorId },
      select: { fileKey: true },
    });
    if (!verification?.fileKey) {
      throw new NotFoundException('Identity verification document not found');
    }
    const { buffer, contentType, fileName } = await this.cloudinaryService.fetchPrivateAsset(
      verification.fileKey,
      { preferredFileName: 'identity-document' }
    );
    res.set('Content-Type', contentType);
    res.set('Content-Disposition', buildContentDispositionHeader(fileName));
    res.set('Cache-Control', 'private, no-store');
    res.send(buffer);
  }

  @Get('tutor-profiles/:tutorId/documents/:documentId/image')
  async proxyProfessionalDocumentImage(
    @Param('tutorId') tutorId: string,
    @Param('documentId') documentId: string,
    @Res() res: Response
  ): Promise<void> {
    const doc = await this.prisma.professionalDocument.findFirst({
      where: { id: documentId, tutorId },
      select: { fileKey: true, name: true },
    });
    if (!doc?.fileKey) {
      throw new NotFoundException('Professional document not found');
    }
    const { buffer, contentType, fileName } = await this.cloudinaryService.fetchPrivateAsset(
      doc.fileKey,
      { preferredFileName: doc.name }
    );
    res.set('Content-Type', contentType);
    res.set('Content-Disposition', buildContentDispositionHeader(fileName));
    res.set('Cache-Control', 'private, no-store');
    res.send(buffer);
  }
}
