import {
  PLATFORM_FEE_PERCENTAGE,
  TRIAL_LESSON_CANCEL_REFUND_HOURS,
  instantFitsUtcWeeklyAvailability,
  subscriptionConcreteOccurrencesSorted,
  subscriptionSlotsOccurrencesForWeek,
  subscriptionSlotsUseConcreteDates,
  type PaginatedResponse,
  type SubscriptionWeeklySlotDto,
} from '@mezon-tutors/shared'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common'
import {
  ECurrency,
  ELessonChangeAction,
  ELessonChangeInitiatorRole,
  ELessonChangeLessonType,
  ESubscriptionEnrollmentStatus,
  EPaymentStatus,
  ETrialLessonStatus,
  Prisma,
  VerificationStatus,
} from '@mezon-tutors/db'
import dayjs = require('dayjs')
import utc = require('dayjs/plugin/utc')
import timezone = require('dayjs/plugin/timezone')

dayjs.extend(utc)
dayjs.extend(timezone)

function weekStartMondayYmd(instant: dayjs.Dayjs, timezoneName: string): string {
  const local = instant.tz(timezoneName).startOf('day')
  const daysFromMonday = (local.day() + 6) % 7
  return local.subtract(daysFromMonday, 'day').format('YYYY-MM-DD')
}
import { PrismaService } from '../../prisma/prisma.service'
import { AppConfigService } from '../../shared/services/app-config.service'
import { VnpayService } from '../vnpay/vnpay.service'
import { CreateTrialLessonBookingDto } from './dto/create-trial-lesson-booking.dto'
import { RescheduleTrialLessonBookingDto } from './dto/reschedule-trial-lesson-booking.dto'
import type { TutorRescheduleRequestDto } from './dto/tutor-reschedule-request.dto'
import type { TutorTrialLessonBookingRequestDto } from './dto/tutor-trial-lesson-booking-request.dto'
import type { TrialLessonBookingDetailDto } from './dto/trial-lesson-booking-detail.dto'
import { WalletService } from '../wallet/wallet.service'

@Injectable()
export class TrialLessonBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vnpayService: VnpayService,
    private readonly appConfig: AppConfigService,
    private readonly walletService: WalletService
  ) {}

  async getTutorBookingRequests(
    tutorUserId: string,
    options?: {
      status?: ETrialLessonStatus
      statusIn?: ETrialLessonStatus[]
      orderBy?: 'startAt' | 'createdAt'
      page?: number
      limit?: number
    }
  ): Promise<PaginatedResponse<TutorTrialLessonBookingRequestDto>> {
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { userId: tutorUserId },
      select: { id: true },
    })

    if (!tutor) {
      throw new NotFoundException('Tutor profile not found for current user')
    }

    const page = Math.max(1, options?.page ?? 1)
    const limit = Math.max(10, Math.min(100, options?.limit ?? 10))
    const statusIn = (options?.statusIn ?? []).filter(Boolean)
    const statusFilter = !statusIn.length ? options?.status : undefined

    const postPayStatuses = new Set<ETrialLessonStatus>([
      ETrialLessonStatus.CONFIRMED,
      ETrialLessonStatus.COMPLETED,
      ETrialLessonStatus.CANCELLED,
    ])
    const needsPaymentSucceeded = statusIn.length
      ? statusIn.every((s) => postPayStatuses.has(s))
      : statusFilter !== undefined && postPayStatuses.has(statusFilter)

    const paidCancelledWhere: Prisma.TrialLessonBookingWhereInput = {
      OR: [
        { paymentStatus: { in: [EPaymentStatus.SUCCEEDED, EPaymentStatus.REFUNDED] } },
        { paidAt: { not: null } },
      ],
    }

    const statusWhere: Prisma.TrialLessonBookingWhereInput = statusIn.length
      ? { status: { in: statusIn } }
      : statusFilter !== undefined
        ? { status: statusFilter }
        : {
            OR: [
              { status: { not: ETrialLessonStatus.CANCELLED } },
              {
                status: ETrialLessonStatus.CANCELLED,
                ...paidCancelledWhere,
              },
            ],
          }

    const cancelledOnlyFilter =
      statusFilter === ETrialLessonStatus.CANCELLED ||
      (statusIn.length === 1 && statusIn[0] === ETrialLessonStatus.CANCELLED)

    const paymentWhere: Prisma.TrialLessonBookingWhereInput | undefined =
      cancelledOnlyFilter
        ? paidCancelledWhere
        : statusFilter === ETrialLessonStatus.CONFIRMED ||
            statusFilter === ETrialLessonStatus.COMPLETED
          ? { paymentStatus: EPaymentStatus.SUCCEEDED }
          : needsPaymentSucceeded && !cancelledOnlyFilter
            ? { paymentStatus: EPaymentStatus.SUCCEEDED }
            : undefined

    const where: Prisma.TrialLessonBookingWhereInput = {
      tutorId: tutor.id,
      ...statusWhere,
      ...(paymentWhere ?? {}),
    }

    const orderBy =
      options?.orderBy === 'startAt' ? ({ startAt: 'asc' } as const) : ({ createdAt: 'desc' } as const);

    const [total, items] = await this.prisma.$transaction([
      this.prisma.trialLessonBooking.count({ where }),
      this.prisma.trialLessonBooking.findMany({
        where,
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
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])
    const totalPages = Math.ceil(total / limit)
    const bookingIds = items.map((item) => item.id)
    const rescheduleRows =
      bookingIds.length > 0
        ? await this.prisma.findCancelRescheduleReasons({
            trialLessonBookingId: { in: bookingIds },
            action: ELessonChangeAction.RESCHEDULE,
          })
        : []
    const rescheduleSubmittedIds = new Set(
      rescheduleRows
        .map((row) => row.trialLessonBookingId)
        .filter((id): id is string => Boolean(id))
    )

    return {
      data: {
        items: items.map((item) => ({
          id: item.id,
          tutorId: item.tutorId,
          studentId: item.student.id,
          studentMezonUserId: item.student.mezonUserId,
          studentName: item.student.username,
          studentAvatarUrl: item.student.avatar,
          startAt: item.startAt.toISOString(),
          durationMinutes: item.durationMinutes,
          grossAmount: Number(item.grossAmount),
          platformFee: Number(item.platformFee),
          tutorAmount: Number(item.tutorAmount),
          currency: item.currency,
          status: item.status,
          createdAt: item.createdAt.toISOString(),
          rescheduleRequestSubmitted: rescheduleSubmittedIds.has(item.id),
        })),
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

  async hasStudentBookedTutor(studentId: string, tutorId: string) {
    const booking = await this.prisma.trialLessonBooking.findFirst({
      where: {
        studentId,
        tutorId,
        status: {
          not: ETrialLessonStatus.CANCELLED,
        },
      },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        startAt: true,
        durationMinutes: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      hasBooked: Boolean(booking),
      bookingId: booking?.id ?? null,
      status: booking?.status ?? null,
      paymentStatus: booking?.paymentStatus ?? null,
      startAt: booking?.startAt?.toISOString() ?? null,
      durationMinutes: booking?.durationMinutes ?? null,
    }
  }

  async getCurrentStudentTutorBooking(studentId: string, tutorId: string) {
    const booking = await this.prisma.trialLessonBooking.findFirst({
      where: {
        studentId,
        tutorId,
        status: {
          not: ETrialLessonStatus.CANCELLED,
        },
      },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        paymentUrl: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      hasBooked: Boolean(booking),
      bookingId: booking?.id ?? null,
      status: booking?.status ?? null,
      paymentStatus: booking?.paymentStatus ?? null,
      paymentUrl: booking?.paymentUrl ?? null,
    }
  }

  async getStudentBookingDetail(studentUserId: string, bookingId: string): Promise<TrialLessonBookingDetailDto> {
    const booking = await this.prisma.trialLessonBooking.findFirst({
      where: {
        id: bookingId,
        studentId: studentUserId,
      },
      include: {
        tutor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            subject: true,
            headline: true,
            user: {
              select: {
                timezone: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            username: true,
            avatar: true,
            email: true,
          },
        },
      },
    })

    if (!booking) {
      throw new NotFoundException('Booking not found')
    }

    const tutorName = `${booking.tutor.firstName} ${booking.tutor.lastName}`.trim()

    return {
      id: booking.id,
      startAt: booking.startAt.toISOString(),
      durationMinutes: booking.durationMinutes,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      grossAmount: Number(booking.grossAmount),
      platformFee: Number(booking.platformFee),
      tutorAmount: Number(booking.tutorAmount),
      currency: booking.currency,
      paidAt: booking.paidAt?.toISOString() ?? null,
      createdAt: booking.createdAt.toISOString(),
      tutor: {
        id: booking.tutor.id,
        displayName: tutorName || booking.tutor.firstName,
        avatarUrl: booking.tutor.avatar,
        subject: booking.tutor.subject,
        headline: booking.tutor.headline,
        timezone: booking.tutor.user?.timezone ?? 'UTC',
      },
      student: {
        id: booking.student.id,
        displayName: booking.student.username,
        avatarUrl: booking.student.avatar,
        email: booking.student.email,
      },
    }
  }

  async getAcceptedByTutorAndDate(
    tutorId: string,
    date: string,
    timezoneName: string,
    excludeBookingId?: string
  ) {
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { id: tutorId },
      select: { id: true },
    })

    if (!tutor) {
      throw new NotFoundException(`Tutor with ID ${tutorId} not found`)
    }

    const dayStartLocal = dayjs.tz(`${date} 00:00`, timezoneName || 'UTC')
    const dayStart = dayStartLocal.utc()
    if (!dayStart.isValid()) {
      throw new BadRequestException('Invalid date')
    }

    const dayEnd = dayStart.add(1, 'day')
    const items = await this.collectOccupiedSlotsForTutorDay(
      tutor.id,
      dayStart.toDate(),
      dayEnd.toDate(),
      timezoneName,
      excludeBookingId
    )

    return { items }
  }

  private parseEnrollmentWeeklySlots(value: Prisma.JsonValue): SubscriptionWeeklySlotDto[] {
    if (!Array.isArray(value)) {
      return []
    }
    return value as unknown as SubscriptionWeeklySlotDto[]
  }

  private async collectOccupiedSlotsForTutorDay(
    tutorId: string,
    dayStart: Date,
    dayEnd: Date,
    timezoneName: string,
    excludeBookingId?: string
  ): Promise<{ id: string; startAt: string; durationMinutes: number }[]> {
    const [bookings, enrollments] = await Promise.all([
      this.prisma.trialLessonBooking.findMany({
        where: {
          tutorId,
          status: {
            in: [ETrialLessonStatus.PENDING, ETrialLessonStatus.CONFIRMED],
          },
          ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
          startAt: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
        select: {
          id: true,
          startAt: true,
          durationMinutes: true,
        },
        orderBy: { startAt: 'asc' },
      }),
      this.prisma.subscriptionEnrollment.findMany({
        where: {
          tutorId,
          status: ESubscriptionEnrollmentStatus.ACTIVE,
          paymentStatus: EPaymentStatus.SUCCEEDED,
        },
        select: {
          id: true,
          weeklySlots: true,
          tutor: {
            select: {
              user: { select: { timezone: true } },
            },
          },
        },
      }),
    ])

    const trialItems = bookings.map((booking) => ({
      id: booking.id,
      startAt: booking.startAt.toISOString(),
      durationMinutes: booking.durationMinutes,
    }))

    const weekStartYmd = weekStartMondayYmd(dayjs(dayStart).tz(timezoneName), timezoneName)
    const subscriptionItems: { id: string; startAt: string; durationMinutes: number }[] = []

    for (const enrollment of enrollments) {
      const slots = this.parseEnrollmentWeeklySlots(enrollment.weeklySlots)
      const tutorTimezone = enrollment.tutor.user?.timezone ?? 'UTC'
      const occurrences = subscriptionSlotsOccurrencesForWeek(
        weekStartYmd,
        slots,
        timezoneName,
        tutorTimezone
      )
      for (const occ of occurrences) {
        if (occ.startAt >= dayStart && occ.startAt < dayEnd) {
          subscriptionItems.push({
            id: `sub-${enrollment.id}-${occ.slotIndex}`,
            startAt: occ.startAt.toISOString(),
            durationMinutes: Math.round(
              (occ.endAt.getTime() - occ.startAt.getTime()) / (60 * 1000)
            ),
          })
        }
      }
    }

    return [...trialItems, ...subscriptionItems].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    )
  }

  private rangesOverlap(
    aStart: Date,
    aEnd: Date,
    bStart: Date,
    bEnd: Date
  ): boolean {
    return aStart < bEnd && aEnd > bStart
  }

  private async assertTrialSlotAvailableForTutor(
    tutorId: string,
    startAt: dayjs.Dayjs,
    durationMinutes: number,
    timezoneName: string,
    excludeBookingId?: string
  ): Promise<void> {
    const availability = await this.prisma.tutorAvailability.findMany({
      where: {
        tutorId,
        isActive: true,
      },
      orderBy: { startTime: 'asc' },
    })

    const fitsAvailability = instantFitsUtcWeeklyAvailability(
      startAt.toISOString(),
      durationMinutes,
      availability.map((slot) => ({
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isActive: slot.isActive,
      }))
    )

    if (!fitsAvailability) {
      throw new BadRequestException('Selected time is not available for this tutor')
    }

    const newStart = startAt.toDate()
    const newEnd = startAt.add(durationMinutes, 'minute').toDate()
    const queryRangeStart = startAt.subtract(1, 'day').toDate()
    const queryRangeEnd = startAt.add(1, 'day').toDate()

    const existingBookings = await this.prisma.trialLessonBooking.findMany({
      where: {
        tutorId,
        status: {
          in: [ETrialLessonStatus.PENDING, ETrialLessonStatus.CONFIRMED],
        },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        startAt: {
          gte: queryRangeStart,
          lt: queryRangeEnd,
        },
      },
      select: {
        startAt: true,
        durationMinutes: true,
      },
    })

    const hasTrialOverlap = existingBookings.some((booking) => {
      const bookedStart = booking.startAt
      const bookedEnd = new Date(bookedStart.getTime() + booking.durationMinutes * 60 * 1000)
      return this.rangesOverlap(newStart, newEnd, bookedStart, bookedEnd)
    })

    if (hasTrialOverlap) {
      throw new ConflictException('Selected time overlaps an existing booking')
    }

    const enrollments = await this.prisma.subscriptionEnrollment.findMany({
      where: {
        tutorId,
        status: ESubscriptionEnrollmentStatus.ACTIVE,
        paymentStatus: EPaymentStatus.SUCCEEDED,
      },
      select: {
        weeklySlots: true,
        tutor: { select: { user: { select: { timezone: true } } } },
      },
    })

    const weekStartYmd = weekStartMondayYmd(startAt, timezoneName)

    for (const enrollment of enrollments) {
      const slots = this.parseEnrollmentWeeklySlots(enrollment.weeklySlots)
      const tutorTimezone = enrollment.tutor.user?.timezone ?? 'UTC'

      const occurrences = subscriptionSlotsUseConcreteDates(slots)
        ? subscriptionConcreteOccurrencesSorted(slots, tutorTimezone)
        : subscriptionSlotsOccurrencesForWeek(
            weekStartYmd,
            slots,
            timezoneName,
            tutorTimezone
          )

      const hasSubscriptionOverlap = occurrences.some((occ) =>
        this.rangesOverlap(newStart, newEnd, occ.startAt, occ.endAt)
      )

      if (hasSubscriptionOverlap) {
        throw new ConflictException('Selected time overlaps a subscription lesson')
      }

      if (!subscriptionSlotsUseConcreteDates(slots)) {
        const prevWeek = dayjs
          .tz(weekStartYmd, timezoneName)
          .subtract(7, 'day')
          .format('YYYY-MM-DD')
        const nextWeek = dayjs.tz(weekStartYmd, timezoneName).add(7, 'day').format('YYYY-MM-DD')
        for (const ymd of [prevWeek, nextWeek]) {
          const adjacent = subscriptionSlotsOccurrencesForWeek(
            ymd,
            slots,
            timezoneName,
            tutorTimezone
          )
          if (
            adjacent.some((occ) =>
              this.rangesOverlap(newStart, newEnd, occ.startAt, occ.endAt)
            )
          ) {
            throw new ConflictException('Selected time overlaps a subscription lesson')
          }
        }
      }
    }
  }

  async createTrialLessonBooking(
    studentId: string,
    dto: CreateTrialLessonBookingDto,
    clientIp: string
  ) {
    const bookingStatus = await this.hasStudentBookedTutor(studentId, dto.tutorId)
    if (bookingStatus.hasBooked) {
      if (bookingStatus.status === ETrialLessonStatus.PENDING) {
        throw new ConflictException(
          'You already have a pending booking with this tutor. Complete payment to confirm it.'
        )
      }
      throw new ConflictException('You have already booked a trial lesson with this tutor')
    }

    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { id: dto.tutorId },
      include: {
        trialLessonPrice: true,
        user: {
          select: {
            timezone: true,
          },
        },
      } as unknown as Prisma.TutorProfileInclude,
    }) as unknown as {
      id: string
      verificationStatus: VerificationStatus
      trialLessonPrice?: { usd: Prisma.Decimal; vnd: bigint; php: Prisma.Decimal } | null
      user?: { timezone: string } | null
    } | null

    if (!tutor || tutor.verificationStatus !== VerificationStatus.APPROVED) {
      throw new NotFoundException(`Tutor with ID ${dto.tutorId} not found`)
    }

    if (!tutor.trialLessonPrice) {
      throw new BadRequestException('Tutor has no configured trial lesson price')
    }
    const selectedCurrency = dto.currency ?? ECurrency.VND

    const startAt = dayjs(dto.startAt)
    if (!startAt.isValid()) {
      throw new BadRequestException('Invalid date or startTime')
    }

    if (startAt.isBefore(dayjs())) {
      throw new BadRequestException('Cannot book lesson in the past')
    }

    const viewerTimezone = tutor.user?.timezone ?? 'UTC'
    await this.assertTrialSlotAvailableForTutor(
      tutor.id,
      startAt,
      dto.durationMinutes,
      viewerTimezone
    )

    const grossAmount = this.calculateGrossAmountByCurrency(
      {
        usd: tutor.trialLessonPrice.usd,
        vnd: tutor.trialLessonPrice.vnd,
        php: tutor.trialLessonPrice.php,
      },
      selectedCurrency,
      dto.durationMinutes
    )
    const platformFeeBps = BigInt(Math.round(PLATFORM_FEE_PERCENTAGE * 10_000))
    const platformFee = (grossAmount * platformFeeBps) / 10_000n
    const tutorAmount = grossAmount - platformFee

    const amountForProvider = Number(grossAmount)
    if (!Number.isFinite(amountForProvider) || amountForProvider < 1) {
      throw new BadRequestException('Invalid payment amount for this lesson')
    }

    if (!this.vnpayService.isConfigured()) {
      throw new ServiceUnavailableException('VNPay is not configured; cannot create payment')
    }

    const booking = await this.prisma.trialLessonBooking.create({
      data: {
        tutorId: tutor.id,
        studentId,
        startAt: startAt.toDate(),
        durationMinutes: dto.durationMinutes,
        grossAmount,
        platformFee,
        tutorAmount,
        currency: selectedCurrency,
        status: ETrialLessonStatus.PENDING,
        paymentStatus: EPaymentStatus.PENDING,
      },
      select: { id: true },
    })

    const publicApi = this.appConfig.publicApiBaseUrl.replace(/\/$/, '')
    const returnUrl = `${publicApi}/api/webhook/vnpay/trial-lesson/return`
    const description = `Trial ${booking.id.slice(0, 8)}`
    const vnpTxnRef = booking.id.replaceAll('-', '').slice(0, 32)

    const checkoutUrl = this.vnpayService.createPaymentUrl({
      vnp_Amount: amountForProvider,
      vnp_OrderInfo: description,
      vnp_TxnRef: vnpTxnRef,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: clientIp.trim() || '127.0.0.1',
    })

    const updated = await this.prisma.trialLessonBooking.update({
      where: { id: booking.id },
      data: {
        paymentRef: vnpTxnRef,
        paymentUrl: checkoutUrl,
      },
      select: {
        id: true,
        tutorId: true,
        studentId: true,
        startAt: true,
        durationMinutes: true,
        status: true,
        currency: true,
        paymentStatus: true,
        grossAmount: true,
        platformFee: true,
        tutorAmount: true,
        paymentRef: true,
        paymentUrl: true,
      },
    })

    return this.serializeTrialLessonBookingResponse(updated)
  }

  private serializeTrialLessonBookingResponse(
    booking: {
    id: string
    tutorId: string
    studentId: string
    startAt: Date
    durationMinutes: number
    status: ETrialLessonStatus
    currency: ECurrency
    paymentStatus: EPaymentStatus
    grossAmount: bigint
    platformFee: bigint
    tutorAmount: bigint
    paymentRef: string | null
    paymentUrl: string | null
  },
  ) {
    return {
      id: booking.id,
      tutorId: booking.tutorId,
      studentId: booking.studentId,
      startAt: booking.startAt.toISOString(),
      durationMinutes: booking.durationMinutes,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      grossAmount: Number(booking.grossAmount),
      platformFee: Number(booking.platformFee),
      tutorAmount: Number(booking.tutorAmount),
      currency: booking.currency,
      paymentProvider: 'vnpay',
      paymentUrl: booking.paymentUrl,
      paymentRef: booking.paymentRef,
    }
  }

  private calculateGrossAmountByCurrency(
    price: { usd: Prisma.Decimal; vnd: bigint; php: Prisma.Decimal },
    currency: ECurrency,
    durationMinutes: number
  ): bigint {
    if (currency === ECurrency.VND) {
      return (price.vnd * BigInt(durationMinutes)) / 60n
    }

    const baseAmount =
      currency === ECurrency.USD ? Number(price.usd) : Number(price.php)

    if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
      throw new BadRequestException(`Invalid ${currency} trial lesson price`)
    }

    const gross = Math.round((baseAmount * durationMinutes) / 60)
    if (gross < 1) {
      throw new BadRequestException(`Invalid ${currency} booking amount`)
    }
    return BigInt(gross)
  }

  async rescheduleTrialLessonBooking(
    studentUserId: string,
    bookingId: string,
    dto: RescheduleTrialLessonBookingDto,
    timezoneName: string
  ) {
    const booking = await this.prisma.trialLessonBooking.findUnique({
      where: { id: bookingId },
      include: {
        tutor: {
          select: {
            id: true,
            user: { select: { timezone: true } },
          },
        },
      },
    })

    if (!booking) {
      throw new NotFoundException('Booking not found')
    }

    if (booking.studentId !== studentUserId) {
      throw new ForbiddenException('Not allowed to reschedule this booking')
    }

    if (booking.status !== ETrialLessonStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed lessons can be rescheduled')
    }

    const hoursUntilStart = dayjs(booking.startAt).utc().diff(dayjs().utc(), 'hour', true)
    if (hoursUntilStart <= TRIAL_LESSON_CANCEL_REFUND_HOURS) {
      throw new BadRequestException(
        'Cannot reschedule within 12 hours of the lesson. Please contact your tutor.'
      )
    }

    const startAt = dayjs(dto.startAt)
    if (!startAt.isValid()) {
      throw new BadRequestException('Invalid start time')
    }

    if (startAt.isBefore(dayjs())) {
      throw new BadRequestException('Cannot reschedule to a time in the past')
    }

    const tz = timezoneName?.trim() || booking.tutor.user?.timezone || 'UTC'
    await this.assertTrialSlotAvailableForTutor(
      booking.tutorId,
      startAt,
      dto.durationMinutes,
      tz,
      booking.id
    )

    await this.prisma.trialLessonBooking.update({
      where: { id: booking.id },
      data: {
        startAt: startAt.toDate(),
        durationMinutes: dto.durationMinutes,
      },
    })

    return { success: true }
  }

  async cancelTrialLessonBooking(
    studentUserId: string,
    bookingId: string,
    payload?: { reason?: string; message?: string }
  ): Promise<{ refunded: boolean }> {
    const booking = await this.prisma.trialLessonBooking.findUnique({
      where: { id: bookingId },
    })

    if (!booking) {
      throw new NotFoundException('Booking not found')
    }

    if (booking.studentId !== studentUserId) {
      throw new ForbiddenException('Not allowed to cancel this booking')
    }

    return this.applyTrialLessonCancellation(booking.id, {
      refundIfEligible: true,
      cancelReason: payload?.reason ?? null,
      cancelMessage: payload?.message ?? null,
    })
  }

  /**
   * Tutor requests to reschedule a confirmed trial lesson: audit log only (no booking update, no refund).
   */
  async tutorRequestRescheduleTrialLesson(
    tutorUserId: string,
    bookingId: string,
    payload: TutorRescheduleRequestDto
  ): Promise<{ success: true; logId: string }> {
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { userId: tutorUserId },
      select: { id: true },
    })

    if (!tutor) {
      throw new NotFoundException('Tutor profile not found for current user')
    }

    const booking = await this.prisma.trialLessonBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        tutorId: true,
        studentId: true,
        startAt: true,
        durationMinutes: true,
        status: true,
      },
    })

    if (!booking) {
      throw new NotFoundException('Booking not found')
    }

    if (booking.tutorId !== tutor.id) {
      throw new ForbiddenException('Not allowed to reschedule this booking')
    }

    if (booking.status !== ETrialLessonStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed lessons can be rescheduled')
    }

    const hoursUntilStart = dayjs(booking.startAt).utc().diff(dayjs().utc(), 'hour', true)
    if (hoursUntilStart <= TRIAL_LESSON_CANCEL_REFUND_HOURS) {
      throw new BadRequestException(
        'Cannot request reschedule within 12 hours of the lesson start time'
      )
    }

    const existingRequest = await this.prisma.findCancelRescheduleReasons({
      trialLessonBookingId: booking.id,
      action: ELessonChangeAction.RESCHEDULE,
    })
    if (existingRequest.length > 0) {
      throw new BadRequestException('A reschedule request was already submitted for this lesson')
    }

    const log = await this.prisma.createCancelRescheduleReason({
      data: {
        studentId: booking.studentId,
        tutorId: booking.tutorId,
        initiatedByUserId: tutorUserId,
        initiatedByRole: ELessonChangeInitiatorRole.TUTOR,
        action: ELessonChangeAction.RESCHEDULE,
        lessonType: ELessonChangeLessonType.TRIAL,
        reason: payload.reason.trim(),
        message: payload.message?.trim() || null,
        trialLessonBookingId: booking.id,
        originalStartAt: booking.startAt,
        originalDurationMinutes: booking.durationMinutes,
      },
    })

    return { success: true, logId: log.id }
  }

  private isTrialLessonPaymentRefundable(booking: {
    paymentStatus: EPaymentStatus
    paidAt: Date | null
    grossAmount: bigint
  }): boolean {
    if (booking.grossAmount <= 0n) {
      return false
    }
    if (booking.paymentStatus === EPaymentStatus.REFUNDED) {
      return false
    }
    if (booking.paymentStatus === EPaymentStatus.FAILED) {
      return false
    }
    if (booking.paymentStatus === EPaymentStatus.SUCCEEDED) {
      return true
    }
    return booking.paidAt != null
  }

  private async applyTrialLessonCancellation(
    bookingId: string,
    options: {
      refundIfEligible: boolean
      cancelReason: string | null
      cancelMessage: string | null
      refundDescription?: string
      requireRefundIfPaid?: boolean
    }
  ): Promise<{ refunded: boolean }> {
    const booking = await this.prisma.trialLessonBooking.findUnique({
      where: { id: bookingId },
    })

    if (!booking) {
      throw new NotFoundException('Booking not found')
    }

    if (booking.status === ETrialLessonStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled')
    }

    const hoursUntilStart = dayjs(booking.startAt).utc().diff(dayjs().utc(), 'hour', true)
    const paymentRefundable = this.isTrialLessonPaymentRefundable(booking)
    const shouldRefund =
      options.refundIfEligible &&
      hoursUntilStart > TRIAL_LESSON_CANCEL_REFUND_HOURS &&
      paymentRefundable

    let refunded = false
    if (shouldRefund) {
      refunded = await this.walletService.refundTrialLessonBooking(booking.id, {
        refundDescription: options.refundDescription,
      })
    }

    if (
      options.requireRefundIfPaid &&
      hoursUntilStart > TRIAL_LESSON_CANCEL_REFUND_HOURS &&
      paymentRefundable &&
      !refunded
    ) {
      throw new BadRequestException(
        'Lesson was cancelled but payment could not be refunded to the student wallet'
      )
    }

    await this.prisma.trialLessonBooking.update({
      where: { id: booking.id },
      data: {
        status: ETrialLessonStatus.CANCELLED,
        cancelReason: options.cancelReason,
        cancelMessage: options.cancelMessage,
      },
    })

    return { refunded }
  }
}
