import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
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
  UpdateMyTutorProfileDto,
  TUTOR_PROFILE_UPDATE_SECTION,
  VerifiedTutorProfileDto,
  normalizeUtcAvailabilityRowsForStorage,
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
import { NotificationService } from '../notification/notification.service';
@Injectable()
export class TutorProfileService {
  private readonly logger = new Logger(TutorProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService
  ) {}

  private buildTrialLessonPriceDataFromPrices(currency: ECurrency, prices: { usd: number; vnd: number; php: number }) {
    return {
      baseCurrency: currency,
      usd: Number(prices.usd).toFixed(2),
      vnd: BigInt(Math.round(prices.vnd)),
      php: Number(prices.php).toFixed(2),
    };
  }

  private async upsertTrialLessonPrice(
    tutorId: string,
    currency: ECurrency,
    prices: { usd: number; vnd: number; php: number }
  ): Promise<void> {
    const trialLessonPriceData = this.buildTrialLessonPriceDataFromPrices(currency, prices);
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
      where: { tutorId },
      update: trialLessonPriceData,
      create: {
        tutorId,
        ...trialLessonPriceData,
      },
    });
  }

  private languagesEqual(
    current: Array<{ languageCode: string; proficiency: string }>,
    next: TutorLanguageDto[]
  ): boolean {
    const normalize = (rows: Array<{ languageCode: string; proficiency: string }>) =>
      [...rows]
        .map((r) => `${r.languageCode}:${r.proficiency}`)
        .sort()
        .join('|');

    return normalize(current) === normalize(next);
  }

  private availabilityEqual(
    current: Array<{ dayOfWeek: number; startTime: string; endTime: string }>,
    next: TutorAvailabilitySlotDto[]
  ): boolean {
    const normalize = (rows: Array<{ dayOfWeek: number; startTime: string; endTime: string }>) =>
      [...rows]
        .map((r) => `${r.dayOfWeek}_${r.startTime}_${r.endTime}`)
        .sort()
        .join('|');

    return normalize(current) === normalize(next);
  }

  private trialPriceEqual(
    current: { baseCurrency: string; usd: unknown; vnd: unknown; php: unknown } | null,
    currency: ECurrency,
    prices: { usd: number; vnd: number; php: number }
  ): boolean {
    if (!current) return false;
    return (
      current.baseCurrency === currency &&
      Number(current.usd) === Number(prices.usd.toFixed(2)) &&
      Number(current.vnd) === prices.vnd &&
      Number(current.php) === Number(prices.php.toFixed(2))
    );
  }

  async putMyProfileByUserId(userId: string, dto: UpdateMyTutorProfileDto): Promise<void> {
    const profile = await this.prisma.tutorProfile.findUnique({
      where: { userId },
      include: {
        languages: true,
        availability: { where: { isActive: true } },
        trialLessonPrice: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Tutor profile not found');
    }

    switch (dto.section) {
      case TUTOR_PROFILE_UPDATE_SECTION.GENERAL: {
        const general = dto.general;
        if (!general) {
          throw new Error('general section payload is required');
        }

        const profileUpdate: Prisma.TutorProfileUpdateInput = {};
        if (general.firstName !== profile.firstName) profileUpdate.firstName = general.firstName;
        if (general.lastName !== profile.lastName) profileUpdate.lastName = general.lastName;
        if (general.country !== profile.country) profileUpdate.country = general.country;
        if (general.phone !== profile.phone) profileUpdate.phone = general.phone;
        if (general.subject !== profile.subject) profileUpdate.subject = general.subject;

        if (Object.keys(profileUpdate).length > 0) {
          await this.prisma.tutorProfile.update({
            where: { userId },
            data: profileUpdate,
          });
        }

        if (!this.languagesEqual(profile.languages, general.languages)) {
          await this.upsertTutorLanguageByUserId(profile.id, general.languages);
        }
        break;
      }
      case TUTOR_PROFILE_UPDATE_SECTION.TUTOR_INFO: {
        const tutorInfo = dto.tutorInfo;
        if (!tutorInfo) {
          throw new Error('tutorInfo section payload is required');
        }

        const profileUpdate: Prisma.TutorProfileUpdateInput = {};
        if (tutorInfo.headline !== profile.headline) profileUpdate.headline = tutorInfo.headline;
        if (tutorInfo.motivate !== profile.motivate) profileUpdate.motivate = tutorInfo.motivate;
        if (tutorInfo.introduce !== profile.introduce) profileUpdate.introduce = tutorInfo.introduce;
        const nextVideoUrl = tutorInfo.videoUrl ?? '';
        if (nextVideoUrl !== (profile.videoUrl ?? '')) profileUpdate.videoUrl = nextVideoUrl;

        if (Object.keys(profileUpdate).length > 0) {
          await this.prisma.tutorProfile.update({
            where: { userId },
            data: profileUpdate,
          });
        }
        break;
      }
      case TUTOR_PROFILE_UPDATE_SECTION.SCHEDULE: {
        const schedule = dto.schedule;
        if (!schedule) {
          throw new Error('schedule section payload is required');
        }

        if (
          !this.trialPriceEqual(profile.trialLessonPrice, schedule.currency, schedule.prices)
        ) {
          await this.upsertTrialLessonPrice(profile.id, schedule.currency, schedule.prices);
        }

        const normalizedAvailability = normalizeUtcAvailabilityRowsForStorage(
          schedule.availability.map((slot) => ({ ...slot, isActive: true }))
        );
        if (!this.availabilityEqual(profile.availability, normalizedAvailability)) {
          await this.upsertTutorAvailabilitySlotByUserId(profile.id, normalizedAvailability);
        }
        break;
      }
      default:
        throw new Error(`Unsupported profile update section: ${dto.section as string}`);
    }
  }

  private buildTrialLessonPriceData(dto: SubmitTutorProfileDto) {
    const baseCurrency = dto.currency ?? ECurrency.VND;
    const prices = dto.prices;

    if (!prices) {
      throw new Error('Price conversion data is missing. Please provide prices in all supported currencies (USD, VND, PHP).');
    }

    return {
      baseCurrency,
      usd: Number(prices.usd).toFixed(2),
      vnd: BigInt(Math.round(prices.vnd)),
      php: Number(prices.php).toFixed(2),
    };
  }

  async upsertByUserId(userId: string, dto: SubmitTutorProfileDto): Promise<void> {
    const existingProfile = await this.prisma.tutorProfile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      await this.updateByUserId(userId, dto);
    } else {
      await this.createByUserId(userId, dto);
    }


    const profile = await this.prisma.tutorProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        user: { select: { avatar: true } },
      },
    });
    if (!profile) {
      return;
    }

    const tutorName =
      `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || 'A tutor';

    try {
      await this.notificationService.notifyAdminTutorApplicationSubmitted({
        tutorName,
        applicationId: profile.id,
        senderAvatarUrl: profile.user.avatar,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to notify admin for tutor application ${profile.id}: ${detail}`);
    }
  }

  private normalizeCloudinaryPublicId(value: string | undefined): string | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) {
      throw new BadRequestException('Secure document reference must be a Cloudinary public_id, not a URL');
    }
    return trimmed;
  }

  private sanitizeMyProfileForClient(
    profile: Prisma.TutorProfileGetPayload<{
      include: {
        languages: true;
        availability: true;
        identityVerification: true;
        professionalDocuments: true;
        trialLessonPrice: true;
      };
    }>
  ) {
    const { identityVerification, professionalDocuments, trialLessonPrice, ...rest } = profile;

    const profileData = trialLessonPrice
      ? {
          ...rest,
          trialLessonPrice: {
            ...trialLessonPrice,
            vnd: trialLessonPrice.vnd.toString(),
          },
        }
      : rest;

    return {
      ...profileData,
      identityVerification: identityVerification
        ? {
            id: identityVerification.id,
            tutorId: identityVerification.tutorId,
            status: identityVerification.status,
            nameMatch: identityVerification.nameMatch,
            notExpired: identityVerification.notExpired,
            photoClarity: identityVerification.photoClarity,
            uploadedAt: identityVerification.uploadedAt,
            reviewedAt: identityVerification.reviewedAt,
            hasFile: Boolean(identityVerification.fileKey?.trim()),
          }
        : null,
      professionalDocuments: professionalDocuments.map((doc) => ({
        id: doc.id,
        tutorId: doc.tutorId,
        name: doc.name,
        type: doc.type,
        status: doc.status,
        uploadedAt: doc.uploadedAt,
        specialization: doc.specialization,
        yearOfComplete: doc.yearOfComplete,
        institution: doc.institution,
        reviewedAt: doc.reviewedAt,
        hasFile: Boolean(doc.fileKey?.trim()),
      })),
    };
  }

  async getMyProfile(userId: string) {
    const profile = await this.prisma.tutorProfile.findUnique({
      where: { userId },
      include: {
        languages: true,
        availability: true,
        identityVerification: true,
        professionalDocuments: true,
        trialLessonPrice: true,
      },
    });

    if (!profile) {
      return {
        hasProfile: false,
        verificationStatus: null,
        profile: null,
      };
    }

    const profileData = this.sanitizeMyProfileForClient(profile);

    return {
      hasProfile: true,
      verificationStatus: profile.verificationStatus,
      profile: profileData,
    };
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
        avatar: dto.avatar,
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

    const identityPublicId = this.normalizeCloudinaryPublicId(dto.identityPhotoPublicId);
    if (identityPublicId && profile) {
      await this.createTutorIdentityVerificationByUserId(profile.id, identityPublicId);
    }

    const teachingCertPublicId = this.normalizeCloudinaryPublicId(dto.teachingCertificatePublicId);
    if (teachingCertPublicId && profile) {
      await this.createTutorCertificateByUserId(profile.id, {
        name: dto.teachingCertificateName,
        fileUrl: teachingCertPublicId,
        type: ProfessionalDocumentType.CERTIFICATE,
        yearOfComplete: dto.teachingYear ? parseInt(dto.teachingYear, 10) : undefined,
      });
    }

    const educationPublicId = this.normalizeCloudinaryPublicId(dto.educationPublicId);
    if (educationPublicId && profile) {
      await this.createTutorCertificateByUserId(profile.id, {
        name: dto.degree,
        fileUrl: educationPublicId,
        type: ProfessionalDocumentType.DEGREE,
        institution: dto.university,
        specialization: dto.specialization,
      });
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
        avatar: dto.avatar,
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
        verificationStatus: VerificationStatus.PENDING,
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

    const identityPublicId = this.normalizeCloudinaryPublicId(dto.identityPhotoPublicId);
    if (identityPublicId && profile) {
      await this.upsertTutorIdentityVerificationByUserId(profile.id, identityPublicId);
    }

    const teachingCertPublicId = this.normalizeCloudinaryPublicId(dto.teachingCertificatePublicId);
    if (teachingCertPublicId && profile) {
      await this.upsertTutorCertificateByUserId(profile.id, {
        name: dto.teachingCertificateName,
        fileUrl: teachingCertPublicId,
        type: ProfessionalDocumentType.CERTIFICATE,
        yearOfComplete: dto.teachingYear ? parseInt(dto.teachingYear, 10) : undefined,
      });
    }

    const educationPublicId = this.normalizeCloudinaryPublicId(dto.educationPublicId);
    if (educationPublicId && profile) {
      await this.upsertTutorCertificateByUserId(profile.id, {
        name: dto.degree,
        fileUrl: educationPublicId,
        type: ProfessionalDocumentType.DEGREE,
        institution: dto.university,
        specialization: dto.specialization,
      });
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
    const normalizedDto = normalizeUtcAvailabilityRowsForStorage(
      dto.map((slot) => ({ ...slot, isActive: true }))
    );

    const current = await this.prisma.tutorAvailability.findMany({
      where: { tutorId: userId },
    });

    await this.prisma.$transaction(async (tx) => {
      const currentMap = new Map(
        current.map((s) => [`${s.dayOfWeek}_${s.startTime}_${s.endTime}`, s])
      );

      const dtoMap = new Map(
        normalizedDto.map((s) => [`${s.dayOfWeek}_${s.startTime}_${s.endTime}`, s])
      );

      const toCreate = normalizedDto.filter(
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
    cloudinaryPublicId: string
  ): Promise<void> {
    await this.prisma.identityVerification.create({
      data: {
        tutorId: userId,
        fileKey: cloudinaryPublicId,
        status: IdentityVerificationStatus.PENDING,
      },
    });
  }

  async upsertTutorIdentityVerificationByUserId(
    userId: string,
    cloudinaryPublicId: string
  ): Promise<void> {
    await this.prisma.identityVerification.upsert({
      where: { tutorId: userId },
      update: {
        fileKey: cloudinaryPublicId,
        status: IdentityVerificationStatus.PENDING,
        uploadedAt: new Date(),
      },
      create: {
        tutorId: userId,
        fileKey: cloudinaryPublicId,
        status: IdentityVerificationStatus.PENDING,
      },
    });
  }

  async createTutorCertificateByUserId(
    userId: string,
    data: {
      name: string;
      fileUrl: string;
      type: ProfessionalDocumentType;
      yearOfComplete?: number;
      institution?: string;
      specialization?: string;
    }
  ): Promise<void> {
    await this.prisma.professionalDocument.create({
      data: {
        tutorId: userId,
        name: data.name,
        type: data.type,
        status: ProfessionalDocumentStatus.PENDING,
        fileKey: data.fileUrl,
        yearOfComplete: data.yearOfComplete,
        institution: data.institution,
        specialization: data.specialization,
      },
    });
  }

  async upsertTutorCertificateByUserId(
    userId: string,
    data: {
      name: string;
      fileUrl: string;
      type: ProfessionalDocumentType;
      yearOfComplete?: number;
      institution?: string;
      specialization?: string;
    }
  ): Promise<void> {
    const existing = await this.prisma.professionalDocument.findFirst({
      where: {
        tutorId: userId,
        type: data.type,
      },
    });

    if (existing) {
      await this.prisma.professionalDocument.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          fileKey: data.fileUrl,
          status: ProfessionalDocumentStatus.PENDING,
          yearOfComplete: data.yearOfComplete,
          institution: data.institution,
          specialization: data.specialization,
          uploadedAt: new Date(),
        },
      });
    } else {
      await this.createTutorCertificateByUserId(userId, data);
    }
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
            timezone: true;
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
            timezone: true,
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
            timezone: true,
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
