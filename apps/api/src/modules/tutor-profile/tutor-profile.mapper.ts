import { Prisma, TutorLanguage, TutorProfile, TutorReview, User } from '@mezon-tutors/db'
import { TutorDetailDto, TutorReviewDto, VerifiedTutorProfileDto } from '@mezon-tutors/shared'
import { ECurrency } from '@mezon-tutors/shared'

type TutorWithPrice = TutorProfile & {
  languages: TutorLanguage[]
  user?: Pick<User, 'mezonUserId' | 'timezone'>
  trialLessonPrice?: {
    baseCurrency?: ECurrency
    usd?: Prisma.Decimal | number | null
    vnd: bigint | Prisma.Decimal
    php?: Prisma.Decimal | number | null
  } | null
}

function getTutorPrices(tutor: TutorWithPrice): {
  baseCurrency: ECurrency
  usd: number
  vnd: number
  php: number
} {
  return {
    baseCurrency: tutor.trialLessonPrice?.baseCurrency ?? ECurrency.VND,
    usd: Number(tutor.trialLessonPrice?.usd ?? 0),
    vnd: Number(tutor.trialLessonPrice?.vnd ?? 0),
    php: Number(tutor.trialLessonPrice?.php ?? 0),
  }
}

export function toVerifiedTutorProfileDto(
  tutor: TutorWithPrice,
): VerifiedTutorProfileDto {
  return {
    id: tutor.id,
    userId: tutor.userId,
    mezonUserId: tutor.user?.mezonUserId ?? '',
    firstName: tutor.firstName,
    lastName: tutor.lastName,
    avatar: tutor.avatar,
    videoUrl: tutor.videoUrl,
    country: tutor.country,
    subject: tutor.subject,
    introduce: tutor.introduce,
    experience: tutor.experience,
    motivate: tutor.motivate,
    headline: tutor.headline,
    prices: getTutorPrices(tutor),
    isProfessional: tutor.isProfessional,
    totalLessonsTaught: tutor.totalLessonsTaught,
    totalStudents: tutor.totalStudents,
    ratingCount: tutor.ratingCount,
    ratingAverage: Number(tutor.ratingAverage),
    timezone: tutor.user?.timezone ?? 'UTC',
    languages: tutor.languages.map((language) => ({ languageCode: language.languageCode, proficiency: language.proficiency })),
  } as unknown as VerifiedTutorProfileDto
}

export function toTutorReviewDto(review: TutorReview & { reviewer: Pick<User, 'id' | 'username' | 'avatar'> }): TutorReviewDto {
  const { id, rating, comment, createdAt, updatedAt, reviewer } = review
  const { id: reviewerId, username: reviewerName, avatar: reviewerAvatar } = reviewer

  return {
    id,
    reviewerId,
    reviewerName,
    reviewerAvatar,
    rating,
    comment,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  }
}

export function toTutorDetailDto(
  tutor: TutorWithPrice & {
    availability: Array<{
      dayOfWeek: number
      startTime: string
      endTime: string
      isActive: boolean
    }>
    reviews: Array<TutorReview & { reviewer: Pick<User, 'id' | 'username' | 'avatar'> }>
  },
  bookedLessonsLast48h: number,
): TutorDetailDto {
  const base = toVerifiedTutorProfileDto(tutor)

  return {
    ...base,
    availability: tutor.availability.map((slot) => ({
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isActive: slot.isActive,
    })),
    reviews: tutor.reviews.map(toTutorReviewDto),
    resources: tutor.videoUrl
      ? [
          {
            id: `${tutor.id}-intro-video`,
            title: 'Intro video',
            type: 'video',
            url: tutor.videoUrl,
          },
        ]
      : [],
    stats: {
      bookedLessonsLast48h,
      totalLessonsTaught: tutor.totalLessonsTaught,
      totalStudents: tutor.totalStudents,
    },
  }
}
