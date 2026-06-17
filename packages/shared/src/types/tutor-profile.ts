import { VerificationStatus } from '../enums/verification-status'
import { ABOUT_COUNTRIES } from '../constants/tutor-profile'
import {
  VALID_IDENTITY_VERIFICATION_STATUSES,
  VALID_PROFESSIONAL_DOCUMENT_STATUSES,
  VALID_PROFESSIONAL_DOCUMENT_TYPES,
  VALID_VERIFICATION_STATUSES,
} from '../constants/admin-tutor-application'
import { ECurrency } from '../enums/currency'

export interface TimeSlotDto {
  startTime: string
  endTime: string
}

export interface TutorAvailabilitySlotDto {
  dayOfWeek: number
  startTime: string
  endTime: string
}

export interface TutorLanguageDto {
  languageCode: string
  proficiency: string
}

export interface SubmitTutorProfileDto {
  firstName: string
  lastName: string
  email: string
  country: CountryEnum
  phone: string
  subject: string
  languages: TutorLanguageDto[]

  avatar: string
  identityPhotoPublicId?: string
  headline: string
  motivate: string
  introduce: string

  teachingCertificateName: string
  teachingYear: string
  teachingCertificatePublicId?: string

  university: string
  degree: string
  specialization: string
  educationPublicId?: string

  cvPublicId?: string
  cvFileName?: string

  videoUrl: string

  pricePerHour: number
  currency: ECurrency
  prices?: {
    usd: number
    vnd: number
    php: number
  }
  availability: TutorAvailabilitySlotDto[]
}

export const TUTOR_PROFILE_UPDATE_SECTION = {
  GENERAL: 'general',
  TUTOR_INFO: 'tutorInfo',
  SCHEDULE: 'schedule',
} as const

export type TutorProfileUpdateSection =
  (typeof TUTOR_PROFILE_UPDATE_SECTION)[keyof typeof TUTOR_PROFILE_UPDATE_SECTION]

export interface UpdateMyTutorProfileGeneralDto {
  firstName: string
  lastName: string
  country: CountryEnum
  phone: string
  subject: string
  languages: TutorLanguageDto[]
}

export interface UpdateMyTutorProfileTutorInfoDto {
  headline: string
  motivate: string
  introduce: string
  videoUrl: string
}

export interface UpdateMyTutorProfileScheduleDto {
  currency: ECurrency
  prices: {
    usd: number
    vnd: number
    php: number
  }
  availability: TutorAvailabilitySlotDto[]
}

export interface UpdateMyTutorProfileDto {
  section: TutorProfileUpdateSection
  general?: UpdateMyTutorProfileGeneralDto
  tutorInfo?: UpdateMyTutorProfileTutorInfoDto
  schedule?: UpdateMyTutorProfileScheduleDto
}

// --- From admin-tutor-application.ts ---

export type TutorAdminNote = {
  id: string
  tutorId: string
  reviewerId: string
  reviewerName: string
  content: string
  createdAt: Date
}

export type ProfessionalDocumentStatus = (typeof VALID_PROFESSIONAL_DOCUMENT_STATUSES)[number]
export type ProfessionalDocumentType = (typeof VALID_PROFESSIONAL_DOCUMENT_TYPES)[number]

export type ProfessionalDocument = {
  id: string
  tutorId: string
  name: string
  type: ProfessionalDocumentType
  status: ProfessionalDocumentStatus
  uploadedAt: Date
  specialization: string | null
  yearOfComplete: number | null
  hasFile: boolean
  /** Original upload filename with extension, when available. */
  fileName: string | null
  /** Uppercase extension label, e.g. PDF, DOCX. */
  fileFormat: string | null
  reviewedAt: Date | null
  institution: string | null
}

export type IdentityVerificationStatus = (typeof VALID_IDENTITY_VERIFICATION_STATUSES)[number]

export type IdentityVerification = {
  id: string
  tutorId: string
  status: IdentityVerificationStatus
  nameMatch: boolean
  notExpired: boolean
  photoClarity: boolean
  uploadedAt: Date
  hasFile: boolean
  reviewedAt: Date | null
}

export type CountryEnum = (typeof ABOUT_COUNTRIES)[number]

export type VerificationStatusEnum = (typeof VALID_VERIFICATION_STATUSES)[number]

export type TutorAvailability = {
  id: string
  tutorId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isActive: boolean
}

export type TutorProfile = {
  id: string
  userId: string
  firstName: string
  lastName: string
  avatar: string
  videoUrl: string
  country: string
  subject: string
  introduce: string
  experience: string
  motivate: string
  headline: string
  prices: {
    baseCurrency: ECurrency
    usd: number
    vnd: number
    php: number
  }
  isProfessional: boolean
  verificationStatus: VerificationStatus
  totalLessonsTaught: number
  totalStudents: number
  ratingCount: number
  ratingAverage: number
  timezone: string
  email: string
  phone: string
  createdAt: Date
  updatedAt: Date
}

export type TutorApplicationMetrics = {
  total_pending: number
  approved_today: number
  avg_review_time_hours: number
  total_pending_change_percent?: number
  approved_today_change_percent?: number
  avg_review_time_change_percent?: number
}

export type TutorCertificate = {
  id: string
  name: string
  size: string
  url?: string
}

export type TutorApplication = {
  id: string
  name: string
  subject: string
  subjectColor: string
  date: string
  status: VerificationStatus
  videoUrl: string
  introVideoTitle: string
  introPreview: string
  headline: string
  motivate: string
  introduce: string
  experience: string
  certificates: TutorCertificate[]
}

export type FullTutorApplication = {
  profile: TutorProfile
  adminNotes: TutorAdminNote[]
  professionalDocuments: ProfessionalDocument[]
  identityVerification: IdentityVerification | null
  availability: TutorAvailability[]
}

export interface VerifiedTutorProfileDto {
  id: string
  userId: string
  mezonUserId: string
  firstName: string
  lastName: string
  avatar: string
  videoUrl: string
  country: string
  subject: string
  introduce: string
  experience: string
  motivate: string
  headline: string
  prices: {
    baseCurrency: ECurrency
    usd: number
    vnd: number
    php: number
  }
  isProfessional: boolean
  totalLessonsTaught: number
  totalStudents: number
  ratingCount: number
  ratingAverage: number
  timezone: string
  languages: TutorLanguageDto[]
  isSaved?: boolean
}

export interface SavedTutorDto extends VerifiedTutorProfileDto {
  savedAt: string
}

export interface TutorReviewDto {
  id: string
  reviewerId: string
  reviewerName: string
  reviewerAvatar: string
  rating: number
  comment: string
  createdAt: string
  updatedAt: string
}

export interface TutorResourceDto {
  id: string
  title: string
  type: 'video'
  url: string
}

export interface TutorDetailStatsDto {
  bookedLessonsLast48h: number
  totalLessonsTaught: number
  totalStudents: number
}

export interface TutorDetailAvailabilitySlotDto extends TutorAvailabilitySlotDto {
  isActive: boolean
}

export interface TutorDetailDto extends VerifiedTutorProfileDto {
  availability: TutorDetailAvailabilitySlotDto[]
  reviews: TutorReviewDto[]
  resources: TutorResourceDto[]
  stats: TutorDetailStatsDto
}

export interface TutorAboutDto extends VerifiedTutorProfileDto {
  stats: TutorDetailStatsDto
}

export interface TutorScheduleDto {
  availability: TutorDetailAvailabilitySlotDto[]
  /** IANA timezone of the tutor (for display). Availability times are stored in UTC. */
  timezone?: string
  /** When true, `availability` dayOfWeek/startTime/endTime are UTC wall-clock (DB canonical). */
  availabilityStoredInUtc?: boolean
}

export interface TutorReviewsDto {
  reviews: TutorReviewDto[]
  ratingCount: number
  ratingAverage: number
}

export interface TutorResourcesDto {
  resources: TutorResourceDto[]
}

export type TutorProfileAboutState = {
  firstName: string
  lastName: string
  email: string
  country: string
  phone: string
  subject: string
  languages: string
  proficiencies: string
  cv: TutorProfileFile
}

export type TutorProfileFile = {
  dataUrl: string | null
  uploadedUrl: string | null
  publicId: string | null
  fileName: string
}

export type TutorProfilePhotoState = {
  photo: TutorProfileFile
  identity: TutorProfileFile
  headline: string
  motivate: string
  introduce: string
}

export type TeachingCertificate = {
  name: string
  year: string
  file: TutorProfileFile
}

export type HigherEducation = {
  university: string
  degree: string
  specialization: string
  file: TutorProfileFile
}

export type TutorProfileCertificationState = {
  teachingCertificate: TeachingCertificate
  higherEducation: HigherEducation
}

export type TutorProfileVideoId = {
  type: 'youtube' | 'vimeo'
  id: string
}

export type TutorProfileVideoState = {
  videoLink: string
  videoId: TutorProfileVideoId | null
}

export type TimeSlot = {
  startTime: string
  endTime: string
}

export type TutorProfileAvailabilityUtcSlot = {
  dayOfWeek: number
  startTime: string
  endTime: string
}

export type TutorProfileAvailabilityState = {
  selectedDayIndex: number
  hourlyRate: string
  currency: ECurrency
  utcAvailability: TutorProfileAvailabilityUtcSlot[]
  slotsByDay?: Record<string, TimeSlot[]>
}