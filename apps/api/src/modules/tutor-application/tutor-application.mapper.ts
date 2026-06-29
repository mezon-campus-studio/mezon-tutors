import { Injectable } from '@nestjs/common';
import { Prisma } from '@mezon-tutors/db';
import {
  ABOUT_COUNTRIES,
  derivePrivateFileDisplayMeta,
  ECurrency,
  FullTutorApplication,
  IdentityVerification,
  parseEnum,
  ProfessionalDocument,
  TutorProfile,
  VALID_IDENTITY_VERIFICATION_STATUSES,
  VALID_PROFESSIONAL_DOCUMENT_STATUSES,
  VALID_PROFESSIONAL_DOCUMENT_TYPES,
  VALID_VERIFICATION_STATUSES,
  VerificationStatus,
} from '@mezon-tutors/shared';

export type TutorProfileWithUser = Prisma.TutorProfileGetPayload<{
  include: { user: true; languages: true };
}> & {
  trialLessonPrice?: {
    baseCurrency?: ECurrency;
    usd?: Prisma.Decimal;
    vnd: bigint | Prisma.Decimal;
    php?: Prisma.Decimal;
  } | null;
};

@Injectable()
export class TutorApplicationMapper {
  mapTutorProfile(profile: TutorProfileWithUser): TutorProfile {
    return {
      id: profile.id,
      userId: profile.userId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatar: profile.user?.avatar ?? '',
      videoUrl: profile.videoUrl,
      country: parseEnum(profile.country, ABOUT_COUNTRIES, 'Other'),
      subject: profile.subject,
      introduce: profile.introduce,
      experience: profile.experience,
      headline: profile.headline,
      prices: {
        baseCurrency: profile.trialLessonPrice?.baseCurrency ?? ECurrency.VND,
        usd: Number(profile.trialLessonPrice?.usd ?? 0),
        vnd: Number(profile.trialLessonPrice?.vnd ?? 0),
        php: Number(profile.trialLessonPrice?.php ?? 0),
      },
      isProfessional: profile.isProfessional,
      activeStatus: profile.activeStatus,
      verificationStatus: parseEnum(
        profile.verificationStatus,
        VALID_VERIFICATION_STATUSES,
        'PENDING'
      ) as VerificationStatus,
      totalLessonsTaught: profile.totalLessonsTaught,
      totalStudents: profile.totalStudents,
      ratingCount: profile.ratingCount,
      ratingAverage: Number(profile.ratingAverage),
      timezone: profile.user?.timezone ?? 'UTC',
      email: profile.email || profile.user?.email || '',
      phone: profile.phone ?? '',
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  mapProfessionalDocument(doc: Prisma.ProfessionalDocumentGetPayload<{}>): ProfessionalDocument {
    const fileMeta = derivePrivateFileDisplayMeta(doc.fileKey, doc.name);
    return {
      id: doc.id,
      tutorId: doc.tutorId,
      name: doc.name,
      type: parseEnum(doc.type, VALID_PROFESSIONAL_DOCUMENT_TYPES, 'OTHER'),
      status: parseEnum(doc.status, VALID_PROFESSIONAL_DOCUMENT_STATUSES, 'PENDING'),
      uploadedAt: doc.uploadedAt,
      specialization: doc.specialization,
      yearOfComplete: doc.yearOfComplete,
      hasFile: Boolean(doc.fileKey?.trim()),
      fileName: fileMeta.fileName,
      fileFormat: fileMeta.fileFormat,
      institution: doc.institution,
      reviewedAt: doc.reviewedAt,
    };
  }

  mapIdentityVerification(
    verification: Prisma.IdentityVerificationGetPayload<{}>
  ): IdentityVerification {
    return {
      id: verification.id,
      tutorId: verification.tutorId,
      status: parseEnum(
        verification.status.toLowerCase(),
        VALID_IDENTITY_VERIFICATION_STATUSES,
        'PENDING'
      ),
      nameMatch: verification.nameMatch,
      notExpired: verification.notExpired,
      photoClarity: verification.photoClarity,
      uploadedAt: verification.uploadedAt,
      hasFile: Boolean(verification.fileKey?.trim()),
      reviewedAt: verification.reviewedAt,
    };
  }

  mapFullTutorApplication(
    profile: TutorProfileWithUser,
    notes: Prisma.TutorAdminNoteGetPayload<{}>[],
    documents: Prisma.ProfessionalDocumentGetPayload<{}>[],
    verification: Prisma.IdentityVerificationGetPayload<{}> | null,
    availability: Prisma.TutorAvailabilityGetPayload<{}>[]
  ): FullTutorApplication {
    return {
      profile: this.mapTutorProfile(profile),
      adminNotes: notes,
      professionalDocuments: documents.map((d) => this.mapProfessionalDocument(d)),
      identityVerification: verification ? this.mapIdentityVerification(verification) : null,
      availability: availability,
    };
  }
}
