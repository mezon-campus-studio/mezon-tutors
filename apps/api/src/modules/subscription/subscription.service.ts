import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ECurrency as PrismaCurrency,
  EPaymentStatus,
  ESubscriptionEnrollmentStatus,
  ETrialLessonStatus,
  Prisma,
  VerificationStatus,
} from '@mezon-tutors/db';
import {
  DEFAULT_TIMEZONE,
  ECurrency,
  PLATFORM_FEE_PERCENTAGE,
  buildMonthlySubscriptionSlotJson,
  jsDayToDbDayOfWeek,
  parseYyyyMmDdToLocalDate,
  timeToMinutes,
  type SubscriptionEligibilityDto,
  type SubscriptionEnrollmentDetailDto,
  type SubscriptionEnrollmentDto,
  type SubscriptionWeeklySlotDto,
  type TutorSubscriptionPlanDto,
  type TutorSubscriptionWeekOccurrenceDto,
  subscriptionSlotsOccurrencesForWeek,
} from '@mezon-tutors/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AppConfigService } from '../../shared/services/app-config.service';
import { VnpayService } from '../vnpay/vnpay.service';
import type { CreateSubscriptionEnrollmentBodyDto } from './dto/create-subscription-enrollment.dto';

const SUBSCRIPTION_MONTHLY_WEEKS = 4;
const PRESET_LESSONS_MIN = 1;
const PRESET_LESSONS_MAX = 7;
const SUBSCRIPTION_SLOT_DURATION_MINUTES = 60;

type SubscriptionEnrollmentSerializeRow = {
  id: string;
  tutorId: string;
  lessonsPerWeek: number;
  status: ESubscriptionEnrollmentStatus;
  weeklySlots: Prisma.JsonValue;
  currency: PrismaCurrency | null;
  createdAt: Date;
  grossAmount: bigint;
  platformFee: bigint;
  tutorAmount: bigint;
  paymentStatus: EPaymentStatus;
  paymentRef: string | null;
  paymentUrl: string | null;
  paidAt: Date | null;
};

function trialToPresetMonthlyPriceRow(
  trial: {
    baseCurrency: PrismaCurrency;
    usd: Prisma.Decimal;
    vnd: bigint;
    php: Prisma.Decimal;
  },
  lessonsPerWeek: number
): { baseCurrency: PrismaCurrency; usd: Prisma.Decimal; vnd: bigint; php: Prisma.Decimal } {
  const sessionsPerMonth = lessonsPerWeek * SUBSCRIPTION_MONTHLY_WEEKS;
  return {
    baseCurrency: trial.baseCurrency,
    usd: new Prisma.Decimal((Number(trial.usd) * sessionsPerMonth).toFixed(6)),
    vnd: trial.vnd * BigInt(sessionsPerMonth),
    php: new Prisma.Decimal((Number(trial.php) * sessionsPerMonth).toFixed(6)),
  };
}

function toPresetPlanDto(
  tutorProfileId: string,
  lessonsPerWeek: number,
  price: {
    baseCurrency: PrismaCurrency;
    usd: Prisma.Decimal;
    vnd: bigint;
    php: Prisma.Decimal;
  }
): TutorSubscriptionPlanDto {
  return {
    id: String(lessonsPerWeek),
    tutorId: tutorProfileId,
    lessonsPerWeek,
    price: {
      baseCurrency: price.baseCurrency as ECurrency,
      usd: Number(price.usd),
      vnd: Number(price.vnd),
      php: Number(price.php),
    },
  };
}

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vnpayService: VnpayService,
    private readonly appConfig: AppConfigService
  ) {}

  async listPlansByTutorProfileId(tutorProfileId: string): Promise<TutorSubscriptionPlanDto[]> {
    const tutor = await this.prisma.tutorProfile.findFirst({
      where: { id: tutorProfileId, verificationStatus: VerificationStatus.APPROVED },
      include: { trialLessonPrice: true },
    });
    if (!tutor) {
      throw new NotFoundException('Tutor not found');
    }
    const trial = tutor.trialLessonPrice;
    if (!trial) {
      return [];
    }
    const out: TutorSubscriptionPlanDto[] = [];
    for (let n = PRESET_LESSONS_MIN; n <= PRESET_LESSONS_MAX; n += 1) {
      const row = trialToPresetMonthlyPriceRow(trial, n);
      out.push(toPresetPlanDto(tutorProfileId, n, row));
    }
    return out;
  }

  async getEligibility(
    studentUserId: string,
    tutorProfileId: string
  ): Promise<SubscriptionEligibilityDto> {
    const tutor = await this.prisma.tutorProfile.findFirst({
      where: { id: tutorProfileId, verificationStatus: VerificationStatus.APPROVED },
      select: { id: true },
    });
    if (!tutor) {
      return {
        eligible: false,
        reason: 'NOT_FOUND',
        trialStatus: null,
        trialPaymentStatus: null,
      };
    }

    const trial = await this.prisma.trialLessonBooking.findFirst({
      where: {
        studentId: studentUserId,
        tutorId: tutorProfileId,
        status: { not: ETrialLessonStatus.CANCELLED },
      },
      orderBy: { createdAt: 'desc' },
      select: { status: true, paymentStatus: true },
    });

    if (
      !trial ||
      trial.status !== ETrialLessonStatus.COMPLETED ||
      trial.paymentStatus !== EPaymentStatus.SUCCEEDED
    ) {
      return {
        eligible: false,
        reason: 'TRIAL_NOT_COMPLETED',
        trialStatus: trial?.status ?? null,
        trialPaymentStatus: trial?.paymentStatus ?? null,
      };
    }

    const trialPrice = await this.prisma.trialLessonPrice.findUnique({
      where: { tutorId: tutorProfileId },
      select: { id: true },
    });
    if (!trialPrice) {
      return {
        eligible: false,
        reason: 'NO_TRIAL_PRICE',
        trialStatus: trial.status,
        trialPaymentStatus: trial.paymentStatus,
      };
    }

    const dup = await this.prisma.subscriptionEnrollment.findFirst({
      where: {
        studentId: studentUserId,
        tutorId: tutorProfileId,
        status: {
          in: [ESubscriptionEnrollmentStatus.PENDING_PAYMENT, ESubscriptionEnrollmentStatus.ACTIVE],
        },
      },
      select: { id: true },
    });
    if (dup) {
      return {
        eligible: false,
        reason: 'ALREADY_ENROLLED',
        trialStatus: trial.status,
        trialPaymentStatus: trial.paymentStatus,
      };
    }

    return {
      eligible: true,
      reason: null,
      trialStatus: trial.status,
      trialPaymentStatus: trial.paymentStatus,
    };
  }

  private slotFitsAvailability(
    availability: { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }[],
    dayOfWeek: number,
    startTime: string,
    durationMinutes: number
  ): boolean {
    const startM = timeToMinutes(startTime);
    const endM = startM + durationMinutes;
    return availability.some((a) => {
      if (!a.isActive || a.dayOfWeek !== dayOfWeek) {
        return false;
      }
      const winStart = timeToMinutes(a.startTime);
      const winEnd = timeToMinutes(a.endTime);
      return startM >= winStart && endM <= winEnd;
    });
  }

  private parseWeeklySlots(value: Prisma.JsonValue): SubscriptionWeeklySlotDto[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value as unknown as SubscriptionWeeklySlotDto[];
  }

  private subscriptionMonthlyGross(
    price: { vnd: bigint; usd: Prisma.Decimal; php: Prisma.Decimal },
    currency: PrismaCurrency
  ): bigint {
    if (currency === PrismaCurrency.VND) {
      if (price.vnd <= 0n) {
        throw new BadRequestException('Invalid plan price');
      }
      return price.vnd;
    }
    if (currency === PrismaCurrency.USD) {
      const v = Number(price.usd);
      if (!Number.isFinite(v) || v <= 0) {
        throw new BadRequestException('Invalid plan price');
      }
      return BigInt(Math.max(1, Math.round(v)));
    }
    const v = Number(price.php);
    if (!Number.isFinite(v) || v <= 0) {
      throw new BadRequestException('Invalid plan price');
    }
    return BigInt(Math.max(1, Math.round(v)));
  }

  private serializeEnrollmentRow(
    row: SubscriptionEnrollmentSerializeRow,
    weeklySlots: SubscriptionWeeklySlotDto[]
  ): SubscriptionEnrollmentDto {
    return {
      id: row.id,
      tutorId: row.tutorId,
      lessonsPerWeek: row.lessonsPerWeek,
      status: row.status,
      weeklySlots,
      currency: (row.currency as ECurrency | null) ?? null,
      createdAt: row.createdAt.toISOString(),
      grossAmount: Number(row.grossAmount),
      platformFee: Number(row.platformFee),
      tutorAmount: Number(row.tutorAmount),
      paymentStatus: row.paymentStatus,
      paymentRef: row.paymentRef,
      paymentUrl: row.paymentUrl,
      paidAt: row.paidAt?.toISOString() ?? null,
    };
  }

  async getEnrollmentDetail(
    studentUserId: string,
    enrollmentId: string
  ): Promise<SubscriptionEnrollmentDetailDto> {
    const row = await this.prisma.subscriptionEnrollment.findFirst({
      where: { id: enrollmentId, studentId: studentUserId },
      include: {
        tutor: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });
    if (!row) {
      throw new NotFoundException('Enrollment not found');
    }
    const weeklySlots = this.parseWeeklySlots(row.weeklySlots);
    const displayName =
      `${row.tutor.firstName} ${row.tutor.lastName}`.trim() || row.tutor.firstName;
    const base = this.serializeEnrollmentRow(
      row as unknown as SubscriptionEnrollmentSerializeRow,
      weeklySlots
    );
    return {
      ...base,
      lessonsPerWeek: row.lessonsPerWeek,
      tutor: {
        id: row.tutor.id,
        displayName,
        avatarUrl: row.tutor.avatar?.trim() ? row.tutor.avatar : null,
      },
    };
  }

  async createEnrollment(
    studentUserId: string,
    dto: CreateSubscriptionEnrollmentBodyDto,
    clientIp: string
  ): Promise<SubscriptionEnrollmentDto> {
    const eligibility = await this.getEligibility(studentUserId, dto.tutorId);
    if (!eligibility.eligible) {
      throw new BadRequestException(eligibility.reason ?? 'Not eligible');
    }

    if (
      dto.lessonsPerWeek < PRESET_LESSONS_MIN ||
      dto.lessonsPerWeek > PRESET_LESSONS_MAX ||
      !Number.isInteger(dto.lessonsPerWeek)
    ) {
      throw new BadRequestException('Invalid lessons per week');
    }

    const trial = await this.prisma.trialLessonPrice.findUnique({
      where: { tutorId: dto.tutorId },
    });
    if (!trial) {
      throw new NotFoundException('Tutor trial pricing not found');
    }

    const planPrice = trialToPresetMonthlyPriceRow(trial, dto.lessonsPerWeek);

    if (dto.slots.length !== dto.lessonsPerWeek) {
      throw new BadRequestException('Slot count must match lessons per week');
    }

    const availability = await this.prisma.tutorAvailability.findMany({
      where: { tutorId: dto.tutorId, isActive: true },
    });

    const normalized: SubscriptionWeeklySlotDto[] = [];
    const seen = new Set<string>();
    for (const s of dto.slots) {
      const d = parseYyyyMmDdToLocalDate(s.date);
      const dbDay = jsDayToDbDayOfWeek(d.getDay());
      const startM = timeToMinutes(s.startTime);
      const endM = timeToMinutes(s.endTime);
      if (endM <= startM) {
        throw new BadRequestException('Invalid slot time range');
      }
      const durationMinutes = endM - startM;
      if (durationMinutes !== SUBSCRIPTION_SLOT_DURATION_MINUTES) {
        throw new BadRequestException('Each subscription slot must be 60 minutes');
      }
      if (!this.slotFitsAvailability(availability, dbDay, s.startTime, durationMinutes)) {
        throw new BadRequestException('Slot outside tutor availability');
      }
      const key = `${dbDay}|${s.startTime}|${durationMinutes}`;
      if (seen.has(key)) {
        throw new BadRequestException('Duplicate weekly slot');
      }
      seen.add(key);
      normalized.push({
        dayOfWeek: dbDay,
        startTime: s.startTime,
        durationMinutes,
      });
    }

    const selectedCurrency = dto.currency;
    const grossAmount = this.subscriptionMonthlyGross(planPrice, selectedCurrency);
    const platformFeeBps = BigInt(Math.round(PLATFORM_FEE_PERCENTAGE * 10_000));
    const platformFee = (grossAmount * platformFeeBps) / 10_000n;
    const tutorAmount = grossAmount - platformFee;
    const amountForProvider = Number(grossAmount);
    if (!Number.isFinite(amountForProvider) || amountForProvider < 1) {
      throw new BadRequestException('Invalid payment amount');
    }
    if (!this.vnpayService.isConfigured()) {
      throw new ServiceUnavailableException('VNPay is not configured; cannot create payment');
    }

    const expandedSlots = buildMonthlySubscriptionSlotJson(
      dto.slots,
      normalized,
      SUBSCRIPTION_MONTHLY_WEEKS,
      DEFAULT_TIMEZONE
    ) as SubscriptionWeeklySlotDto[];

    const created = await this.prisma.subscriptionEnrollment.create({
      data: {
        studentId: studentUserId,
        tutorId: dto.tutorId,
        lessonsPerWeek: dto.lessonsPerWeek,
        status: ESubscriptionEnrollmentStatus.PENDING_PAYMENT,
        weeklySlots: expandedSlots as unknown as Prisma.InputJsonValue,
        currency: selectedCurrency,
        grossAmount,
        platformFee,
        tutorAmount,
        paymentStatus: EPaymentStatus.PENDING,
      },
      select: { id: true },
    });

    const publicApi = this.appConfig.publicApiBaseUrl.replace(/\/$/, '');
    const returnUrl = `${publicApi}/api/webhook/vnpay/subscription-enrollment/return`;
    const description = `Sub ${created.id.slice(0, 8)}`;
    const vnpTxnRef = created.id.replaceAll('-', '').slice(0, 32);

    const checkoutUrl = this.vnpayService.createPaymentUrl({
      vnp_Amount: amountForProvider,
      vnp_OrderInfo: description,
      vnp_TxnRef: vnpTxnRef,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: clientIp.trim() || '127.0.0.1',
    });

    const updated = await this.prisma.subscriptionEnrollment.update({
      where: { id: created.id },
      data: {
        paymentRef: vnpTxnRef,
        paymentUrl: checkoutUrl,
      },
    });

    return this.serializeEnrollmentRow(
      updated as unknown as SubscriptionEnrollmentSerializeRow,
      expandedSlots
    );
  }

  async listTutorWeekOccurrences(
    tutorUserId: string,
    weekStartYmd: string
  ): Promise<TutorSubscriptionWeekOccurrenceDto[]> {
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { userId: tutorUserId },
      select: { id: true },
    });
    if (!tutor) {
      return [];
    }
    const enrollments = await this.prisma.subscriptionEnrollment.findMany({
      where: {
        tutorId: tutor.id,
        status: ESubscriptionEnrollmentStatus.ACTIVE,
        paymentStatus: EPaymentStatus.SUCCEEDED,
      },
      include: {
        student: {
          select: {
            id: true,
            username: true,
            avatar: true,
            mezonUserId: true,
          },
        },
      },
    });
    const out: TutorSubscriptionWeekOccurrenceDto[] = [];
    for (const e of enrollments) {
      const slots = this.parseWeeklySlots(e.weeklySlots);
      const times = subscriptionSlotsOccurrencesForWeek(weekStartYmd, slots, DEFAULT_TIMEZONE);
      for (const t of times) {
        const slot = slots[t.slotIndex];
        if (!slot) {
          continue;
        }
        out.push({
          scheduleKind: 'subscription',
          id: `sub-${e.id}-${t.slotIndex}`,
          enrollmentId: e.id,
          studentId: e.student.id,
          studentMezonUserId: e.student.mezonUserId,
          studentName: e.student.username,
          studentAvatarUrl: e.student.avatar?.trim() ? e.student.avatar : null,
          tutorProfileId: tutor.id,
          startAt: t.startAt.toISOString(),
          durationMinutes: slot.durationMinutes,
        });
      }
    }
    return out;
  }
}
