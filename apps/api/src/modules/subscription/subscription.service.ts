import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common'
import {
  ECurrency as PrismaCurrency,
  EPaymentStatus,
  ESubscriptionEnrollmentStatus,
  ETrialLessonStatus,
  Prisma,
  Role,
  VerificationStatus,
} from '@mezon-tutors/db'
import {
  ECurrency,
  PLATFORM_FEE_PERCENTAGE,
  fetchCurrencyRates,
  jsDayToDbDayOfWeek,
  parseYyyyMmDdToLocalDate,
  timeToMinutes,
  triPricesFromMonthlyBase,
  type SubscriptionEligibilityDto,
  type SubscriptionEnrollmentDetailDto,
  type SubscriptionEnrollmentDto,
  type SubscriptionWeeklySlotDto,
  type TutorSubscriptionWeekOccurrenceDto,
  type TutorSubscriptionPlanDto,
  subscriptionWeeklySlotsToOccurrencesInTimezone,
} from '@mezon-tutors/shared'
import { PrismaService } from '../../prisma/prisma.service'
import { AppConfigService } from '../../shared/services/app-config.service'
import { VnpayService } from '../vnpay/vnpay.service'
import type { CreateSubscriptionEnrollmentBodyDto } from './dto/create-subscription-enrollment.dto'
import type { ReplaceTutorSubscriptionPlansBodyDto } from './dto/replace-tutor-subscription-plans.dto'

type SubscriptionEnrollmentSerializeRow = {
  id: string
  tutorId: string
  planId: string
  status: ESubscriptionEnrollmentStatus
  weeklySlots: Prisma.JsonValue
  currency: PrismaCurrency | null
  createdAt: Date
  grossAmount: bigint
  platformFee: bigint
  tutorAmount: bigint
  paymentStatus: EPaymentStatus
  paymentRef: string | null
  paymentUrl: string | null
  paidAt: Date | null
}

function toPlanDto(row: {
  id: string
  tutorId: string
  lessonsPerWeek: number
  price: {
    baseCurrency: PrismaCurrency
    usd: Prisma.Decimal
    vnd: bigint
    php: Prisma.Decimal
  } | null
}): TutorSubscriptionPlanDto {
  const price = row.price
  if (!price) {
    throw new Error('Plan price missing')
  }
  return {
    id: row.id,
    tutorId: row.tutorId,
    lessonsPerWeek: row.lessonsPerWeek,
    price: {
      baseCurrency: price.baseCurrency as ECurrency,
      usd: Number(price.usd),
      vnd: Number(price.vnd),
      php: Number(price.php),
    },
  }
}

function buildPriceCreate(price: {
  baseCurrency: PrismaCurrency
  usd: number
  vnd: number
  php: number
}) {
  return {
    baseCurrency: price.baseCurrency,
    usd: new Prisma.Decimal(Number(price.usd).toFixed(6)),
    vnd: BigInt(Math.round(price.vnd)),
    php: new Prisma.Decimal(Number(price.php).toFixed(6)),
  }
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
      select: { id: true },
    })
    if (!tutor) {
      throw new NotFoundException('Tutor not found')
    }
    const rows = await this.prisma.tutorSubscriptionPlan.findMany({
      where: { tutorId: tutorProfileId },
      include: { price: true },
      orderBy: { lessonsPerWeek: 'asc' },
    })
    return rows.map((r) =>
      toPlanDto({
        id: r.id,
        tutorId: r.tutorId,
        lessonsPerWeek: r.lessonsPerWeek,
        price: r.price,
      })
    )
  }

  private async requireTutorActor(tutorUserId: string): Promise<{
    id: string
    baseCurrency: PrismaCurrency
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: tutorUserId },
      select: { role: true },
    })
    if (user?.role !== Role.TUTOR) {
      throw new ForbiddenException()
    }
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { userId: tutorUserId },
      select: {
        id: true,
        trialLessonPrice: { select: { baseCurrency: true } },
      },
    })
    if (!tutor) {
      throw new NotFoundException('Tutor profile not found')
    }
    const baseCurrency = tutor.trialLessonPrice?.baseCurrency
    if (!baseCurrency) {
      throw new BadRequestException('Configure trial lesson pricing in your profile first')
    }
    return { id: tutor.id, baseCurrency }
  }

  async listMyPlans(tutorUserId: string): Promise<TutorSubscriptionPlanDto[]> {
    const tutor = await this.requireTutorActor(tutorUserId)
    return this.listPlansByTutorProfileId(tutor.id)
  }

  async replaceMyPlans(
    tutorUserId: string,
    dto: ReplaceTutorSubscriptionPlansBodyDto
  ): Promise<TutorSubscriptionPlanDto[]> {
    const tutor = await this.requireTutorActor(tutorUserId)

    let rates: Record<string, number> = {}
    if (dto.plans.length > 0) {
      try {
        rates = await fetchCurrencyRates(tutor.baseCurrency as ECurrency)
      } catch {
        throw new BadRequestException('Unable to fetch exchange rates. Please try again later.')
      }
    }

    const existing = await this.prisma.tutorSubscriptionPlan.findMany({
      where: { tutorId: tutor.id },
      include: {
        enrollments: {
          where: {
            status: {
              in: [ESubscriptionEnrollmentStatus.PENDING_PAYMENT, ESubscriptionEnrollmentStatus.ACTIVE],
            },
          },
          select: { id: true },
        },
      },
    })

    const incomingIds = new Set(dto.plans.map((p) => p.id).filter(Boolean) as string[])
    const protectedIds = existing.filter((p) => p.enrollments.length > 0).map((p) => p.id)

    for (const pid of protectedIds) {
      if (!incomingIds.has(pid)) {
        throw new BadRequestException('Plans with enrollments must remain in the list')
      }
    }

    const lessonsSeen = new Set<number>()
    for (const p of dto.plans) {
      if (lessonsSeen.has(p.lessonsPerWeek)) {
        throw new BadRequestException('Each plan must have a distinct number of sessions per week')
      }
      lessonsSeen.add(p.lessonsPerWeek)
    }

    const sortedPlans = [...dto.plans].sort((a, b) => a.lessonsPerWeek - b.lessonsPerWeek)

    const toDelete = existing
      .filter((p) => !incomingIds.has(p.id) && p.enrollments.length === 0)
      .map((p) => p.id)

    await this.prisma.$transaction(async (tx) => {
      if (toDelete.length) {
        await tx.tutorSubscriptionPlan.deleteMany({
          where: { id: { in: toDelete }, tutorId: tutor.id },
        })
      }

      for (const p of sortedPlans) {
        let tri: { usd: number; vnd: number; php: number }
        try {
          tri = triPricesFromMonthlyBase(p.monthlyPrice, tutor.baseCurrency as ECurrency, rates)
        } catch {
          throw new BadRequestException('Invalid or incomplete exchange rates for your base currency.')
        }
        const priceData = buildPriceCreate({
          baseCurrency: tutor.baseCurrency,
          usd: tri.usd,
          vnd: tri.vnd,
          php: tri.php,
        })
        if (p.id) {
          const row = await tx.tutorSubscriptionPlan.findFirst({
            where: { id: p.id, tutorId: tutor.id },
          })
          if (!row) {
            throw new BadRequestException('Invalid plan id')
          }
          await tx.tutorSubscriptionPlan.update({
            where: { id: p.id },
            data: {
              lessonsPerWeek: p.lessonsPerWeek,
            },
          })
          await tx.tutorSubscriptionPlanPrice.upsert({
            where: { planId: p.id },
            create: { planId: p.id, ...priceData },
            update: priceData,
          })
        } else {
          await tx.tutorSubscriptionPlan.create({
            data: {
              tutorId: tutor.id,
              lessonsPerWeek: p.lessonsPerWeek,
              price: { create: priceData },
            },
          })
        }
      }
    })

    return this.listPlansByTutorProfileId(tutor.id)
  }

  async getEligibility(studentUserId: string, tutorProfileId: string): Promise<SubscriptionEligibilityDto> {
    const tutor = await this.prisma.tutorProfile.findFirst({
      where: { id: tutorProfileId, verificationStatus: VerificationStatus.APPROVED },
      select: { id: true },
    })
    if (!tutor) {
      return {
        eligible: false,
        reason: 'NOT_FOUND',
        trialStatus: null,
        trialPaymentStatus: null,
      }
    }

    const trial = await this.prisma.trialLessonBooking.findFirst({
      where: {
        studentId: studentUserId,
        tutorId: tutorProfileId,
        status: { not: ETrialLessonStatus.CANCELLED },
      },
      orderBy: { createdAt: 'desc' },
      select: { status: true, paymentStatus: true },
    })

    if (!trial || trial.status !== ETrialLessonStatus.COMPLETED || trial.paymentStatus !== EPaymentStatus.SUCCEEDED) {
      return {
        eligible: false,
        reason: 'TRIAL_NOT_COMPLETED',
        trialStatus: trial?.status ?? null,
        trialPaymentStatus: trial?.paymentStatus ?? null,
      }
    }

    const planCount = await this.prisma.tutorSubscriptionPlan.count({
      where: { tutorId: tutorProfileId },
    })
    if (planCount === 0) {
      return {
        eligible: false,
        reason: 'NO_PLANS',
        trialStatus: trial.status,
        trialPaymentStatus: trial.paymentStatus,
      }
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
    })
    if (dup) {
      return {
        eligible: false,
        reason: 'ALREADY_ENROLLED',
        trialStatus: trial.status,
        trialPaymentStatus: trial.paymentStatus,
      }
    }

    return {
      eligible: true,
      reason: null,
      trialStatus: trial.status,
      trialPaymentStatus: trial.paymentStatus,
    }
  }

  private slotFitsAvailability(
    availability: { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }[],
    dayOfWeek: number,
    startTime: string,
    durationMinutes: number
  ): boolean {
    const startM = timeToMinutes(startTime)
    const endM = startM + durationMinutes
    return availability.some((a) => {
      if (!a.isActive || a.dayOfWeek !== dayOfWeek) {
        return false
      }
      const winStart = timeToMinutes(a.startTime)
      const winEnd = timeToMinutes(a.endTime)
      return startM >= winStart && endM <= winEnd
    })
  }

  private parseWeeklySlots(value: Prisma.JsonValue): SubscriptionWeeklySlotDto[] {
    if (!Array.isArray(value)) {
      return []
    }
    return value as unknown as SubscriptionWeeklySlotDto[]
  }

  private subscriptionMonthlyGross(
    price: { vnd: bigint; usd: Prisma.Decimal; php: Prisma.Decimal },
    currency: PrismaCurrency
  ): bigint {
    if (currency === PrismaCurrency.VND) {
      if (price.vnd <= 0n) {
        throw new BadRequestException('Invalid plan price')
      }
      return price.vnd
    }
    if (currency === PrismaCurrency.USD) {
      const v = Number(price.usd)
      if (!Number.isFinite(v) || v <= 0) {
        throw new BadRequestException('Invalid plan price')
      }
      return BigInt(Math.max(1, Math.round(v)))
    }
    const v = Number(price.php)
    if (!Number.isFinite(v) || v <= 0) {
      throw new BadRequestException('Invalid plan price')
    }
    return BigInt(Math.max(1, Math.round(v)))
  }

  private serializeEnrollmentRow(
    row: SubscriptionEnrollmentSerializeRow,
    weeklySlots: SubscriptionWeeklySlotDto[]
  ): SubscriptionEnrollmentDto {
    return {
      id: row.id,
      tutorId: row.tutorId,
      planId: row.planId,
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
    }
  }

  async getEnrollmentDetail(
    studentUserId: string,
    enrollmentId: string
  ): Promise<SubscriptionEnrollmentDetailDto> {
    const row = await this.prisma.subscriptionEnrollment.findFirst({
      where: { id: enrollmentId, studentId: studentUserId },
      include: {
        plan: { select: { lessonsPerWeek: true } },
        tutor: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    })
    if (!row) {
      throw new NotFoundException('Enrollment not found')
    }
    const weeklySlots = this.parseWeeklySlots(row.weeklySlots)
    const displayName = `${row.tutor.firstName} ${row.tutor.lastName}`.trim() || row.tutor.firstName
    const base = this.serializeEnrollmentRow(row as unknown as SubscriptionEnrollmentSerializeRow, weeklySlots)
    return {
      ...base,
      lessonsPerWeek: row.plan.lessonsPerWeek,
      tutor: {
        id: row.tutor.id,
        displayName,
        avatarUrl: row.tutor.avatar?.trim() ? row.tutor.avatar : null,
      },
    }
  }

  async createEnrollment(
    studentUserId: string,
    dto: CreateSubscriptionEnrollmentBodyDto,
    clientIp: string
  ): Promise<SubscriptionEnrollmentDto> {
    const eligibility = await this.getEligibility(studentUserId, dto.tutorId)
    if (!eligibility.eligible) {
      throw new BadRequestException(eligibility.reason ?? 'Not eligible')
    }

    const plan = await this.prisma.tutorSubscriptionPlan.findFirst({
      where: { id: dto.planId, tutorId: dto.tutorId },
      include: { price: true },
    })
    if (!plan || !plan.price) {
      throw new NotFoundException('Plan not found')
    }

    if (dto.slots.length !== plan.lessonsPerWeek) {
      throw new BadRequestException('Slot count must match lessons per week')
    }

    const availability = await this.prisma.tutorAvailability.findMany({
      where: { tutorId: dto.tutorId, isActive: true },
    })

    const normalized: SubscriptionWeeklySlotDto[] = []
    const seen = new Set<string>()
    for (const s of dto.slots) {
      const d = parseYyyyMmDdToLocalDate(s.date)
      const dbDay = jsDayToDbDayOfWeek(d.getDay())
      const startM = timeToMinutes(s.startTime)
      const endM = timeToMinutes(s.endTime)
      if (endM <= startM) {
        throw new BadRequestException('Invalid slot time range')
      }
      const durationMinutes = endM - startM
      if (durationMinutes < 30 || durationMinutes > 120) {
        throw new BadRequestException('Invalid lesson duration')
      }
      if (!this.slotFitsAvailability(availability, dbDay, s.startTime, durationMinutes)) {
        throw new BadRequestException('Slot outside tutor availability')
      }
      const key = `${dbDay}|${s.startTime}|${durationMinutes}`
      if (seen.has(key)) {
        throw new BadRequestException('Duplicate weekly slot')
      }
      seen.add(key)
      normalized.push({
        dayOfWeek: dbDay,
        startTime: s.startTime,
        durationMinutes,
      })
    }

    const selectedCurrency = dto.currency
    const grossAmount = this.subscriptionMonthlyGross(plan.price, selectedCurrency)
    const platformFeeBps = BigInt(Math.round(PLATFORM_FEE_PERCENTAGE * 10_000))
    const platformFee = (grossAmount * platformFeeBps) / 10_000n
    const tutorAmount = grossAmount - platformFee
    const amountForProvider = Number(grossAmount)
    if (!Number.isFinite(amountForProvider) || amountForProvider < 1) {
      throw new BadRequestException('Invalid payment amount')
    }
    if (!this.vnpayService.isConfigured()) {
      throw new ServiceUnavailableException('VNPay is not configured; cannot create payment')
    }

    const created = await this.prisma.subscriptionEnrollment.create({
      data: {
        studentId: studentUserId,
        tutorId: dto.tutorId,
        planId: dto.planId,
        status: ESubscriptionEnrollmentStatus.PENDING_PAYMENT,
        weeklySlots: normalized as unknown as Prisma.InputJsonValue,
        currency: selectedCurrency,
        grossAmount,
        platformFee,
        tutorAmount,
        paymentStatus: EPaymentStatus.PENDING,
      } as never,
      select: { id: true },
    })

    const publicApi = this.appConfig.publicApiBaseUrl.replace(/\/$/, '')
    const returnUrl = `${publicApi}/api/webhook/vnpay/subscription-enrollment/return`
    const description = `Sub ${created.id.slice(0, 8)}`
    const vnpTxnRef = created.id.replaceAll('-', '').slice(0, 32)

    const checkoutUrl = this.vnpayService.createPaymentUrl({
      vnp_Amount: amountForProvider,
      vnp_OrderInfo: description,
      vnp_TxnRef: vnpTxnRef,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: clientIp.trim() || '127.0.0.1',
    })

    const updated = await this.prisma.subscriptionEnrollment.update({
      where: { id: created.id },
      data: {
        paymentRef: vnpTxnRef,
        paymentUrl: checkoutUrl,
      } as never,
    })

    return this.serializeEnrollmentRow(updated as unknown as SubscriptionEnrollmentSerializeRow, normalized)
  }

  async listTutorWeekOccurrences(
    tutorUserId: string,
    weekStartYmd: string
  ): Promise<TutorSubscriptionWeekOccurrenceDto[]> {
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { userId: tutorUserId },
      select: { id: true },
    })
    if (!tutor) {
      return []
    }
    const enrollments = await this.prisma.subscriptionEnrollment.findMany({
      where: {
        tutorId: tutor.id,
        status: {
          in: [ESubscriptionEnrollmentStatus.ACTIVE, ESubscriptionEnrollmentStatus.PENDING_PAYMENT],
        },
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
    })
    const out: TutorSubscriptionWeekOccurrenceDto[] = []
    for (const e of enrollments) {
      const slots = this.parseWeeklySlots(e.weeklySlots)
      const times = subscriptionWeeklySlotsToOccurrencesInTimezone(weekStartYmd, slots)
      slots.forEach((slot, idx) => {
        const t = times[idx]
        if (!t) {
          return
        }
        out.push({
          scheduleKind: 'subscription',
          id: `sub-${e.id}-${idx}`,
          enrollmentId: e.id,
          studentId: e.student.id,
          studentMezonUserId: e.student.mezonUserId,
          studentName: e.student.username,
          studentAvatarUrl: e.student.avatar?.trim() ? e.student.avatar : null,
          tutorProfileId: tutor.id,
          startAt: t.startAt.toISOString(),
          durationMinutes: slot.durationMinutes,
        })
      })
    }
    return out
  }
}
