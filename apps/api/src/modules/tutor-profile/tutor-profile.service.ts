import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CountryLabel,
  ECountry,
  ECurrency,
  ESubject,
  ETutorSortBy,
  SubjectLabel,
  PaginatedResponse,
  SubmitTutorProfileDto,
  TutorAvailabilitySlotDto,
  TutorLanguageDto,
  VerifiedTutorProfileDto,
} from '@mezon-tutors/shared';
import {
  ETrialLessonStatus,
  IdentityVerificationStatus,
  Prisma,
  ProfessionalDocumentStatus,
  ProfessionalDocumentType,
  Role,
  VerificationStatus,
} from '@mezon-tutors/db';
import dayjs = require('dayjs');
import { toTutorReviewDto, toVerifiedTutorProfileDto } from './tutor-profile.mapper';
import { VerifiedTutorQueryDto } from './dto/verified-tutor-query.dto';
@Injectable()
export class TutorProfileService {
  constructor(private readonly prisma: PrismaService) {}

  private buildTrialLessonPriceData(dto: SubmitTutorProfileDto) {
    const baseCurrency = dto.currency ?? ECurrency.VND;
    const prices = (dto as any).prices;

    if (prices) {
      return {
        baseCurrency,
        usd: String(prices.usd),
        vnd: BigInt(Math.round(prices.vnd)),
        php: String(prices.php),
      };
    }

    const price = Number((dto as any).pricePerHour ?? (dto as any).price ?? 0);
    const normalized = Math.max(0, price);
    
    let usd = normalized / 25000;
    let vnd = normalized;
    let php = usd * 57;

    if (baseCurrency === ECurrency.USD) {
      usd = normalized;
      vnd = usd * 25000;
      php = usd * 57;
    } else if (baseCurrency === ECurrency.PHP) {
      php = normalized;
      usd = php / 57;
      vnd = usd * 25000;
    }

    return {
      baseCurrency,
      usd: usd.toFixed(6),
      vnd: BigInt(Math.round(vnd)),
      php: php.toFixed(6),
    };
  }

  async getMyTutorProfileStatus(userId: string): Promise<{ hasProfile: boolean; verificationStatus: VerificationStatus | null }> {
    const profile = await this.prisma.tutorProfile.findUnique({
      where: { userId },
      select: { verificationStatus: true },
    })

    if (!profile) {
      return {
        hasProfile: false,
        verificationStatus: null,
      }
    }

    return {
      hasProfile: true,
      verificationStatus: profile.verificationStatus,
    }
  }

  async createReview(
    tutorId: string,
    reviewerId: string,
    rating: number,
    comment: string
  ): Promise<void> {
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { id: tutorId },
      select: { ratingCount: true, ratingAverage: true },
    })

    if (!tutor) {
      throw new NotFoundException(`Tutor with ID ${tutorId} not found`)
    }

    const newCount = tutor.ratingCount + 1;
    const newAverage =
      (Number(tutor.ratingCount) * Number(tutor.ratingAverage) + rating) / newCount;

    await this.prisma.$transaction(async (tx) => {
      await tx.tutorReview.create({
        data: {
          tutorId,
          reviewerId,
          rating,
          comment,
        },
      })

      await tx.tutorProfile.update({
        where: { id: tutorId },
        data: {
          ratingCount: newCount,
          ratingAverage: newAverage,
        },
      })
    })
  }

  async createByUserId(userId: string, dto: SubmitTutorProfileDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.role === Role.TUTOR) {
      throw new Error('User is already tutor yet!');
    }

    const profile = await this.prisma.tutorProfile.create({
      data: {
        userId: userId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        videoUrl: dto.videoUrl ?? '',
        country: dto.country,
        phone: dto.phone,
        email: dto.email,
        subject: dto.subject,
        introduce: dto.introduce,
        experience: dto.specialization,
        motivate: dto.motivate,
        headline: dto.headline,
        ratingAverage: 0,
        verificationStatus: VerificationStatus.PENDING,
      } as unknown as Prisma.TutorProfileCreateInput,
    });

    const trialLessonPriceData = this.buildTrialLessonPriceData(dto);
    const trialLessonPriceDelegate = (
      this.prisma as unknown as {
        trialLessonPrice: {
          upsert: (args: {
            where: { tutorId: string };
            update: {
              baseCurrency: ECurrency;
              usd: string;
              vnd: bigint;
              php: string;
            };
            create: {
              tutorId: string;
              baseCurrency: ECurrency;
              usd: string;
              vnd: bigint;
              php: string;
            };
          }) => Promise<unknown>;
        };
      }
    ).trialLessonPrice;

    await trialLessonPriceDelegate.upsert({
      where: { tutorId: profile.id },
      update: trialLessonPriceData,
      create: {
        tutorId: profile.id,
        ...trialLessonPriceData,
      },
    });

    if (dto.languages?.length && profile) {
      await this.upsertTutorLanguageByUserId(profile.id, dto.languages);
    }

    if (dto.availability?.length && profile) {
      await this.upsertTutorAvailabilitySlotByUserId(profile.id, dto.availability);
    }

    if (dto.identityPhotoUrl && profile) {
      await this.createTutorIdentityVerificationByUserId(profile.id, dto.identityPhotoUrl);
    }

    if (dto.teachingCertificateFileUrl && profile) {
      await this.createTutorCertificateByUserId(
        profile.id,
        dto.teachingCertificateName,
        dto.teachingCertificateFileUrl,
        ProfessionalDocumentType.CERTIFICATE
      );
    }

    if (dto.educationFileUrl && profile) {
      await this.createTutorCertificateByUserId(
        profile.id,
        dto.specialization,
        dto.educationFileUrl,
        ProfessionalDocumentType.DEGREE
      );
    }
  }

  async updateByUserId(userId: string, dto: SubmitTutorProfileDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const profile = await this.prisma.tutorProfile.update({
      where: { userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        videoUrl: dto.videoUrl ?? '',
        country: dto.country,
        phone: dto.phone,
        email: dto.email,
        subject: dto.subject,
        introduce: dto.introduce,
        experience: dto.specialization,
        motivate: dto.motivate,
        headline: dto.headline,
        isProfessional: !!dto.teachingCertificateName,
      } as unknown as Prisma.TutorProfileUpdateInput,
    });

    const trialLessonPriceData = this.buildTrialLessonPriceData(dto);
    const trialLessonPriceDelegate = (
      this.prisma as unknown as {
        trialLessonPrice: {
          upsert: (args: {
            where: { tutorId: string };
            update: {
              baseCurrency: ECurrency;
              usd: string;
              vnd: bigint;
              php: string;
            };
            create: {
              tutorId: string;
              baseCurrency: ECurrency;
              usd: string;
              vnd: bigint;
              php: string;
            };
          }) => Promise<unknown>;
        };
      }
    ).trialLessonPrice;

    await trialLessonPriceDelegate.upsert({
      where: { tutorId: profile.id },
      update: trialLessonPriceData,
      create: {
        tutorId: profile.id,
        ...trialLessonPriceData,
      },
    });

    if (dto.languages?.length && profile) {
      await this.upsertTutorLanguageByUserId(profile.id, dto.languages);
    }

    if (dto.availability?.length && profile) {
      await this.upsertTutorAvailabilitySlotByUserId(profile.id, dto.availability);
    }
  }

  async upsertTutorLanguageByUserId(userId: string, dto: TutorLanguageDto[]): Promise<void> {
    const current = await this.prisma.tutorLanguage.findMany({
      where: { tutorId: userId },
    });
    await this.prisma.$transaction(async (tx) => {
      const currentMap = new Map(current.map((l) => [l.languageCode, l]));
      const dtoMap = new Map(dto.map((l) => [l.languageCode, l]));
      const toCreate = dto.filter((l) => !currentMap.has(l.languageCode));
      const toUpdate = dto.filter((l) => currentMap.has(l.languageCode));
      const toDelete = current.filter((l) => !dtoMap.has(l.languageCode));

      if (toCreate.length) {
        await tx.tutorLanguage.createMany({
          data: toCreate.map((l) => ({
            tutorId: userId,
            languageCode: l.languageCode,
            proficiency: l.proficiency,
          })),
        });
      }

      for (const l of toUpdate) {
        await tx.tutorLanguage.update({
          where: {
            tutorId_languageCode: {
              tutorId: userId,
              languageCode: l.languageCode,
            },
          },
          data: {
            proficiency: l.proficiency,
          },
        });
      }

      if (toDelete.length) {
        await tx.tutorLanguage.deleteMany({
          where: {
            tutorId: userId,
            languageCode: {
              in: toDelete.map((l) => l.languageCode),
            },
          },
        });
      }
    });
  }

  async upsertTutorAvailabilitySlotByUserId(
    userId: string,
    dto: TutorAvailabilitySlotDto[]
  ): Promise<void> {
    const current = await this.prisma.tutorAvailability.findMany({
      where: { tutorId: userId },
    });

    await this.prisma.$transaction(async (tx) => {
      const currentMap = new Map(
        current.map((s) => [`${s.dayOfWeek}_${s.startTime}_${s.endTime}`, s])
      );

      const dtoMap = new Map(dto.map((s) => [`${s.dayOfWeek}_${s.startTime}_${s.endTime}`, s]));

      const toCreate = dto.filter(
        (s) => !currentMap.has(`${s.dayOfWeek}_${s.startTime}_${s.endTime}`)
      );

      const toDelete = current.filter(
        (s) => !dtoMap.has(`${s.dayOfWeek}_${s.startTime}_${s.endTime}`)
      );

      if (toCreate.length) {
        await tx.tutorAvailability.createMany({
          data: toCreate.map((s) => ({
            tutorId: userId,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            isActive: true,
          })),
        });
      }

      if (toDelete.length) {
        await tx.tutorAvailability.deleteMany({
          where: {
            tutorId: userId,
            OR: toDelete.map((s) => ({
              dayOfWeek: s.dayOfWeek,
              startTime: s.startTime,
              endTime: s.endTime,
            })),
          },
        });
      }
    });
  }

  async createTutorIdentityVerificationByUserId(
    userId: string,
    identityPhotoUrl: string
  ): Promise<void> {
    await this.prisma.identityVerification.create({
      data: {
        tutorId: userId,
        fileKey: identityPhotoUrl,
        status: IdentityVerificationStatus.PENDING,
      },
    });
  }

  async createTutorCertificateByUserId(
    userId: string,
    teachingCertificateName: string,
    teachingCertificateFileUrl: string,
    type: ProfessionalDocumentType
  ): Promise<void> {
    await this.prisma.professionalDocument.create({
      data: {
        tutorId: userId,
        name: teachingCertificateName,
        type,
        status: ProfessionalDocumentStatus.PENDING,
        fileKey: teachingCertificateFileUrl,
      },
    });
  }

  async getVerifiedTutors(
    query: VerifiedTutorQueryDto
  ): Promise<PaginatedResponse<VerifiedTutorProfileDto>> {
    const {
      page,
      limit,
      sortBy = ETutorSortBy.POPULARITY,
      subject = ESubject.ANY_SUBJECT,
      country = ECountry.ANY_COUNTRY,
      currency = ECurrency.VND,
      minPrice,
      maxPrice,
    } = query

    const where: Prisma.TutorProfileWhereInput = {
      verificationStatus: VerificationStatus.APPROVED,
    }

    if (subject && subject !== ESubject.ANY_SUBJECT) {
      where.subject = SubjectLabel[subject]
    }

    if (country && country !== ECountry.ANY_COUNTRY) {
      where.country = CountryLabel[country];
    }

    type TutorWithComputedPrice = Prisma.TutorProfileGetPayload<{
      include: {
        languages: true;
        user: {
          select: {
            mezonUserId: true;
          };
        };
      };
    }> & {
      trialLessonPrice?: {
        usd: Prisma.Decimal;
        vnd: bigint;
        php: Prisma.Decimal;
      } | null;
    };

    const allTutors = (await this.prisma.tutorProfile.findMany({
      where,
      include: {
        trialLessonPrice: true,
        languages: true,
        user: {
          select: {
            mezonUserId: true,
          },
        },
      } as unknown as Prisma.TutorProfileInclude,
    })) as unknown as TutorWithComputedPrice[];

    const getTutorPriceByCurrency = (
      tutor: TutorWithComputedPrice,
      targetCurrency: ECurrency
    ): number | null => {
      if (!tutor.trialLessonPrice) {
        return null;
      }

      switch (targetCurrency) {
        case ECurrency.USD:
          return Number(tutor.trialLessonPrice.usd);
        case ECurrency.PHP:
          return Number(tutor.trialLessonPrice.php);
        case ECurrency.VND:
          return Number(tutor.trialLessonPrice.vnd);
      }
    }

    const tutorsWithComputedPrices = allTutors.map((tutor) => {
      const priceInQueryCurrency = getTutorPriceByCurrency(tutor, currency)
      const priceInVnd = getTutorPriceByCurrency(tutor, ECurrency.VND)

      return {
        tutor,
        priceInQueryCurrency,
        priceInVnd,
      }
    })

    const hasMin = typeof minPrice === 'number' && !Number.isNaN(minPrice)
    const hasMax = typeof maxPrice === 'number' && !Number.isNaN(maxPrice)

    const filtered = tutorsWithComputedPrices.filter((x) => {
      if (x.priceInQueryCurrency == null) return true

      if (hasMin && x.priceInQueryCurrency < minPrice) return false
      if (hasMax && x.priceInQueryCurrency > maxPrice) return false
      return true
    })

    const getPriceSortValue = (x: (typeof filtered)[number]) =>
      x.priceInQueryCurrency ?? Number.MAX_SAFE_INTEGER

    const sortSecondaryIdAsc = (a: (typeof filtered)[number], b: (typeof filtered)[number]) =>
      a.tutor.id.localeCompare(b.tutor.id)

    filtered.sort((a, b) => {
      switch (sortBy) {
        case ETutorSortBy.HIGHEST_PRICE: {
          const diff = getPriceSortValue(b) - getPriceSortValue(a)
          return diff !== 0 ? diff : sortSecondaryIdAsc(a, b)
        }
        case ETutorSortBy.LOWEST_PRICE: {
          const diff = getPriceSortValue(a) - getPriceSortValue(b)
          return diff !== 0 ? diff : sortSecondaryIdAsc(a, b)
        }
        case ETutorSortBy.NUMBER_OF_REVIEWS: {
          const diff = b.tutor.ratingCount - a.tutor.ratingCount
          return diff !== 0 ? diff : sortSecondaryIdAsc(a, b)
        }
        case ETutorSortBy.BEST_RATING: {
          const diff = Number(b.tutor.ratingAverage) - Number(a.tutor.ratingAverage)
          return diff !== 0 ? diff : sortSecondaryIdAsc(a, b)
        }
        case ETutorSortBy.TOP_PICKS: {
          const diff = b.tutor.totalStudents - a.tutor.totalStudents
          return diff !== 0 ? diff : sortSecondaryIdAsc(a, b)
        }
        default: {
          const diffRatingAvg = Number(b.tutor.ratingAverage) - Number(a.tutor.ratingAverage)
          if (diffRatingAvg !== 0) return diffRatingAvg
          const diffRatingCount = b.tutor.ratingCount - a.tutor.ratingCount
          if (diffRatingCount !== 0) return diffRatingCount
          return sortSecondaryIdAsc(a, b)
        }
      }
    })

    const total = filtered.length
    const totalPages = Math.ceil(total / limit)
    const paged = filtered.slice((page - 1) * limit, page * limit)

    return {
      data: {
        items: paged.map(({ tutor }) =>
          toVerifiedTutorProfileDto(tutor as unknown as Parameters<typeof toVerifiedTutorProfileDto>[0])
        ),
        meta: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
      error: null,
    }
  }

  async getVerifiedTutorAbout(id: string) {
    const tutor = (await this.prisma.tutorProfile.findUnique({
      where: { id },
      include: {
        trialLessonPrice: true,
        languages: true,
        user: {
          select: {
            mezonUserId: true,
          },
        },
      } as unknown as Prisma.TutorProfileInclude,
    })) as unknown as Parameters<typeof toVerifiedTutorProfileDto>[0] | null;

    if (!tutor) {
      throw new NotFoundException(`Tutor with ID ${id} not found`)
    }

    const bookedLessonsLast48h = await this.prisma.trialLessonBooking.count({
      where: {
        tutorId: tutor.id,
        status: {
          in: [ETrialLessonStatus.PENDING, ETrialLessonStatus.CONFIRMED],
        },
        startAt: {
          gte: dayjs().subtract(48, 'hour').toDate(),
        },
      },
    })

    return {
      ...toVerifiedTutorProfileDto(tutor),
      stats: {
        bookedLessonsLast48h,
        totalLessonsTaught: tutor.totalLessonsTaught,
        totalStudents: tutor.totalStudents,
      },
    }
  }

  async getVerifiedTutorSchedule(id: string) {
    const availability = await this.prisma.tutorAvailability.findMany({
      where: {
        tutorId: id,
        isActive: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    })

    return {
      availability: availability.map((slot) => ({
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isActive: slot.isActive,
      })),
    }
  }

  async getVerifiedTutorReviews(id: string) {
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { id },
      select: {
        id: true,
        ratingCount: true,
        ratingAverage: true,
      },
    })

    if (!tutor) {
      throw new NotFoundException(`Tutor with ID ${id} not found`)
    }

    const reviews = await this.prisma.tutorReview.findMany({
      where: {
        tutorId: id,
      },
      include: {
        reviewer: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return {
      reviews: reviews.map(toTutorReviewDto),
      ratingCount: tutor.ratingCount,
      ratingAverage: Number(tutor.ratingAverage),
    }
  }

  async getVerifiedTutorResources(id: string) {
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { id },
      select: {
        id: true,
        videoUrl: true,
      },
    })

    if (!tutor) {
      throw new NotFoundException(`Tutor with ID ${id} not found`)
    }

    return {
      resources: tutor.videoUrl
        ? [
            {
              id: `${tutor.id}-intro-video`,
              title: 'Intro video',
              type: 'video' as const,
              url: tutor.videoUrl,
            },
          ]
        : [],
    }
  }
}
