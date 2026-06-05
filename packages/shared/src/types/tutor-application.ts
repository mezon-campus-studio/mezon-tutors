import { VerificationStatus } from '../enums/verification-status';
import { ABOUT_COUNTRIES } from '../constants/tutor-profile';
import { ECurrency } from '../enums/currency';
import {
  VALID_IDENTITY_VERIFICATION_STATUSES,
  VALID_PROFESSIONAL_DOCUMENT_STATUSES,
  VALID_PROFESSIONAL_DOCUMENT_TYPES,
  VALID_VERIFICATION_STATUSES,
} from '../constants/admin-tutor-application';

export interface TimeSlotDto {
  startTime: string;
  endTime: string;
}

export interface TutorAvailabilitySlotDto {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface TutorLanguageDto {
  languageCode: string;
  proficiency: string;
}

export interface SubmitTutorProfileDto {
  firstName: string;
  lastName: string;
  email: string;
  country: CountryEnum;
  phone: string;
  subject: string;
  languages: TutorLanguageDto[];

  avatar?: string;
  headline: string;
  motivate: string;
  introduce: string;

  teachingCertificateName: string;
  teachingYear: string;
  university: string;
  degree: string;
  specialization: string;

  videoUrl: string;

  price: number;
  currency: ECurrency;
  prices?: {
    usd: number;
    vnd: number;
    php: number;
  };
  availability: TutorAvailabilitySlotDto[];
}

// --- From admin-tutor-application.ts ---

export type TutorAdminNote = {
  id: string;
  tutorId: string;
  reviewerId: string;
  reviewerName: string;
  content: string;
  createdAt: Date;
};

export type ProfessionalDocumentStatus = (typeof VALID_PROFESSIONAL_DOCUMENT_STATUSES)[number];
export type ProfessionalDocumentType = (typeof VALID_PROFESSIONAL_DOCUMENT_TYPES)[number];

export type ProfessionalDocument = {
  id: string;
  tutorId: string;
  name: string;
  type: ProfessionalDocumentType;
  status: ProfessionalDocumentStatus;
  uploadedAt: Date;
  specialization: string | null;
  yearOfComplete: number | null;
  hasFile: boolean;
  reviewedAt: Date | null;
  institution: string | null;
};

export type IdentityVerificationStatus = (typeof VALID_IDENTITY_VERIFICATION_STATUSES)[number];

export type IdentityVerification = {
  id: string;
  tutorId: string;
  status: IdentityVerificationStatus;
  nameMatch: boolean;
  notExpired: boolean;
  photoClarity: boolean;
  uploadedAt: Date;
  hasFile: boolean;
  reviewedAt: Date | null;
};

export type CountryEnum = (typeof ABOUT_COUNTRIES)[number];

export type VerificationStatusEnum = (typeof VALID_VERIFICATION_STATUSES)[number];

export type TutorAvailability = {
  id: string;
  tutorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

export type TutorProfile = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  avatar: string;
  videoUrl: string;
  country: string;
  subject: string;
  introduce: string;
  experience: string;
  motivate: string;
  headline: string;
  prices: {
    baseCurrency: ECurrency;
    usd: number;
    vnd: number;
    php: number;
  };
  isProfessional: boolean;
  verificationStatus: VerificationStatus;
  totalLessonsTaught: number;
  totalStudents: number;
  ratingCount: number;
  ratingAverage: number;
  timezone: string;
  email: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TutorApplicationMetrics = {
  total_pending: number;
  approved_today: number;
  avg_review_time_hours: number;
  total_pending_change_percent?: number;
  approved_today_change_percent?: number;
  avg_review_time_change_percent?: number;
};

export type TutorCertificate = {
  id: string;
  name: string;
  size: string;
  url?: string;
};

export type TutorApplication = {
  id: string;
  name: string;
  subject: string;
  subjectColor: string;
  date: string;
  status: VerificationStatus;
  videoUrl: string;
  introVideoTitle: string;
  introPreview: string;
  headline: string;
  motivate: string;
  introduce: string;
  experience: string;
  certificates: TutorCertificate[];
};

export type FullTutorApplication = {
  profile: TutorProfile;
  adminNotes: TutorAdminNote[];
  professionalDocuments: ProfessionalDocument[];
  identityVerification: IdentityVerification | null;
  availability: TutorAvailability[];
};
