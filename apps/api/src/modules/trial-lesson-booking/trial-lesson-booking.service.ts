import {
  calculatePlatformFeeAmounts,
  instantFitsUtcWeeklyAvailability,
  isTrialLessonPaymentHoldActive,
  subscriptionConcreteOccurrencesSorted,
  subscriptionSlotsOccurrencesForWeek,
  subscriptionSlotsUseConcreteDates,
  DEFAULT_TIMEZONE,
  LESSON_AUTO_COMPLETE_GRACE_MINUTES,
  LESSON_CANCEL_REASON_SLOT_CONFLICT,
  TRIAL_LESSON_PAYMENT_HOLD_MS,
  addMinutes,
  trialLessonPaymentHoldExpiresAt,
  EPaymentProvider,
  buildTrialLessonPaymentDescription,
  formatTutorDisplayName,
  inferPaymentProviderFromUrl,
  type PaginatedResponse,
  type SubscriptionWeeklySlotDto,
} from '@mezon-tutors/shared'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  ECurrency,
  ELessonChangeAction,
  ELessonChangeInitiatorRole,
  ELessonChangeLessonType,
  ELessonSettlementJobStatus,
  ESubscriptionEnrollmentStatus,
  EPaymentStatus,
  ETrialLessonStatus,
  Prisma,
  VerificationStatus,
} from '@mezon-tutors/db'
import {
  ESubscriptionLessonSlotStatus,
  normalizeSubscriptionSlotStatus,
} from '@mezon-tutors/shared'
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
import { PaymentCheckoutService } from '../payment/payment-checkout.service'
import { CreateTrialLessonBookingDto } from './dto/create-trial-lesson-booking.dto'
import { RescheduleTrialLessonBookingDto } from './dto/reschedule-trial-lesson-booking.dto'
import type { TutorRescheduleRequestDto } from './dto/tutor-reschedule-request.dto'
import type { TutorTrialLessonBookingRequestDto } from './dto/tutor-trial-lesson-booking-request.dto'
import type { TrialLessonBookingDetailDto } from './dto/trial-lesson-booking-detail.dto'
import { WalletService } from '../wallet/wallet.service'
import { WalletCheckoutService } from '../wallet/wallet-checkout.service'
import { transactionEconomicsFromGrossTutorFee } from '../wallet/transaction-economics'
import { AppSettingsService } from '../app-settings/app-settings.service'
import { NotificationService } from '../notification/notification.service'
import { LessonSettlementService } from '../lesson-settlement/lesson-settlement.service'
import { GoogleCalendarSyncService } from '../google-calendar/google-calendar-sync.service'

@Injectable()
export class TrialLessonBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentCheckoutService: PaymentCheckoutService,
    private readonly walletService: WalletService,
    private readonly walletCheckoutService: WalletCheckoutService,
    private readonly appSettingsService: AppSettingsService,
    private readonly notificationService: NotificationService,
    private readonly lessonSettlementService: LessonSettlementService,
    private readonly googleCalendarSyncService: GoogleCalendarSyncService,
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
    const includesCancelled =
      statusIn.includes(ETrialLessonStatus.CANCELLED) ||
      statusFilter === ETrialLessonStatus.CANCELLED
    const nonCancelledStatusIn = statusIn.filter((s) => s !== ETrialLessonStatus.CANCELLED)

    let paymentWhere: Prisma.TrialLessonBookingWhereInput | undefined
    if (cancelledOnlyFilter) {
      paymentWhere = paidCancelledWhere
    } else if (
      statusIn.length > 0 &&
      includesCancelled &&
      nonCancelledStatusIn.length > 0
    ) {
      paymentWhere = {
        OR: [
          {
            status: ETrialLessonStatus.CANCELLED,
            ...paidCancelledWhere,
          },
          {
            status: { in: nonCancelledStatusIn },
            paymentStatus: EPaymentStatus.SUCCEEDED,
          },
        ],
      }
    } else if (
      statusFilter === ETrialLessonStatus.CONFIRMED ||
      statusFilter === ETrialLessonStatus.COMPLETED
    ) {
      paymentWhere = { paymentStatus: EPaymentStatus.SUCCEEDED }
    } else if (needsPaymentSucceeded && !cancelledOnlyFilter) {
      paymentWhere = { paymentStatus: EPaymentStatus.SUCCEEDED }
    }

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
    const [rescheduleRows, cancelRows] =
      bookingIds.length > 0
        ? await Promise.all([
            this.prisma.findCancelRescheduleReasons({
              trialLessonBookingId: { in: bookingIds },
              action: ELessonChangeAction.RESCHEDULE,
            }),
            this.prisma.findCancelRescheduleReasons({
              trialLessonBookingId: { in: bookingIds },
              action: ELessonChangeAction.CANCEL,
            }),
          ])
        : [[], []]
    const rescheduleSubmittedIds = new Set(
      rescheduleRows
        .map((row) => row.trialLessonBookingId)
        .filter((id): id is string => Boolean(id))
    )
    const cancellationSubmittedIds = new Set(
      cancelRows
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
          cancellationRequestSubmitted: cancellationSubmittedIds.has(item.id),
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

  private activeTrialBookingWhere(): Prisma.TrialLessonBookingWhereInput {
    const holdCutoff = new Date(Date.now() - TRIAL_LESSON_PAYMENT_HOLD_MS)
    return {
      status: { not: ETrialLessonStatus.CANCELLED },
      OR: [
        { status: { not: ETrialLessonStatus.PENDING } },
        {
          status: ETrialLessonStatus.PENDING,
          paymentStatus: EPaymentStatus.PENDING,
          createdAt: { gte: holdCutoff },
        },
      ],
    }
  }

  private slotBlockingTrialBookingWhere(): Prisma.TrialLessonBookingWhereInput {
    const holdCutoff = new Date(Date.now() - TRIAL_LESSON_PAYMENT_HOLD_MS)
    return {
      OR: [
        { status: ETrialLessonStatus.CONFIRMED },
        {
          status: ETrialLessonStatus.PENDING,
          paymentStatus: EPaymentStatus.PENDING,
          createdAt: { gte: holdCutoff },
        },
      ],
    }
  }

  private slotBlockingSubscriptionEnrollmentWhere(): Prisma.SubscriptionEnrollmentWhereInput {
    const holdCutoff = new Date(Date.now() - TRIAL_LESSON_PAYMENT_HOLD_MS)
    return {
      OR: [
        {
          status: ESubscriptionEnrollmentStatus.ACTIVE,
          paymentStatus: EPaymentStatus.SUCCEEDED,
        },
        {
          status: ESubscriptionEnrollmentStatus.PENDING_PAYMENT,
          paymentStatus: EPaymentStatus.PENDING,
          createdAt: { gte: holdCutoff },
        },
      ],
    }
  }

  private isSubscriptionOccurrenceExcluded(
    enrollmentId: string,
    slotIndex: number,
    options?: {
      excludeTrialBookingId?: string
      excludeSubscriptionSlot?: { enrollmentId: string; slotIndex: number }
      excludeSubscriptionEnrollmentId?: string
    }
  ): boolean {
    if (
      options?.excludeSubscriptionEnrollmentId &&
      enrollmentId === options.excludeSubscriptionEnrollmentId
    ) {
      return true
    }
    if (
      options?.excludeSubscriptionSlot &&
      enrollmentId === options.excludeSubscriptionSlot.enrollmentId &&
      slotIndex === options.excludeSubscriptionSlot.slotIndex
    ) {
      return true
    }
    return false
  }

  private isSubscriptionEnrollmentPaymentHold(enrollment: {
    status: ESubscriptionEnrollmentStatus
    paymentStatus: EPaymentStatus
  }): boolean {
    return (
      enrollment.status === ESubscriptionEnrollmentStatus.PENDING_PAYMENT &&
      enrollment.paymentStatus === EPaymentStatus.PENDING
    )
  }

  async hasStudentBookedTutor(studentId: string, tutorId: string) {
    const booking = await this.prisma.trialLessonBooking.findFirst({
      where: {
        studentId,
        tutorId,
        ...this.activeTrialBookingWhere(),
      },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        startAt: true,
        durationMinutes: true,
        createdAt: true,
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
      paymentExpiresAt:
        booking?.status === ETrialLessonStatus.PENDING &&
        booking.paymentStatus === EPaymentStatus.PENDING
          ? trialLessonPaymentHoldExpiresAt(booking.createdAt).toISOString()
          : null,
    }
  }

  async getCurrentStudentTutorBooking(studentId: string, tutorId: string) {
    const booking = await this.prisma.trialLessonBooking.findFirst({
      where: {
        studentId,
        tutorId,
        ...this.activeTrialBookingWhere(),
      },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        paymentUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      hasBooked: Boolean(booking),
      bookingId: booking?.id ?? null,
      status: booking?.status ?? null,
      paymentStatus: booking?.paymentStatus ?? null,
      paymentUrl: booking?.paymentUrl ?? null,
      paymentExpiresAt:
        booking?.status === ETrialLessonStatus.PENDING &&
        booking.paymentStatus === EPaymentStatus.PENDING
          ? trialLessonPaymentHoldExpiresAt(booking.createdAt).toISOString()
          : null,
    }
  }

  async getStudentPendingPaymentBookings(studentId: string) {
    const holdCutoff = new Date(Date.now() - TRIAL_LESSON_PAYMENT_HOLD_MS)
    const rows = await this.prisma.trialLessonBooking.findMany({
      where: {
        studentId,
        status: ETrialLessonStatus.PENDING,
        paymentStatus: EPaymentStatus.PENDING,
        createdAt: { gte: holdCutoff },
      },
      include: {
        tutor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      items: rows.map((row) => {
        const tutorName = `${row.tutor.firstName} ${row.tutor.lastName}`.trim()
        return {
          id: row.id,
          tutorId: row.tutor.id,
          tutorName: tutorName || row.tutor.firstName,
          tutorAvatarUrl: row.tutor.avatar,
          startAt: row.startAt.toISOString(),
          durationMinutes: row.durationMinutes,
          grossAmount: Number(row.grossAmount),
          currency: row.currency,
          paymentUrl: row.paymentUrl,
          createdAt: row.createdAt.toISOString(),
          expiresAt: trialLessonPaymentHoldExpiresAt(row.createdAt).toISOString(),
        }
      }),
    }
  }

  async expireStalePendingPaymentBookings(): Promise<number> {
    const holdCutoff = new Date(Date.now() - TRIAL_LESSON_PAYMENT_HOLD_MS)
    const stale = await this.prisma.trialLessonBooking.findMany({
      where: {
        status: ETrialLessonStatus.PENDING,
        paymentStatus: EPaymentStatus.PENDING,
        createdAt: { lt: holdCutoff },
      },
      select: { id: true },
    })

    let expired = 0
    for (const row of stale) {
      const cancelled = await this.cancelExpiredPendingPaymentBooking(row.id)
      if (cancelled) {
        expired += 1
      }
    }
    return expired
  }

  private async cancelExpiredPendingPaymentBooking(bookingId: string): Promise<boolean> {
    const booking = await this.prisma.trialLessonBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
      },
    })

    if (!booking) {
      return false
    }
    if (booking.status === ETrialLessonStatus.CANCELLED) {
      return false
    }
    if (
      booking.status !== ETrialLessonStatus.PENDING ||
      booking.paymentStatus !== EPaymentStatus.PENDING
    ) {
      return false
    }
    if (isTrialLessonPaymentHoldActive(booking.createdAt)) {
      return false
    }

    await this.prisma.trialLessonBooking.update({
      where: { id: booking.id },
      data: {
        status: ETrialLessonStatus.CANCELLED,
        paymentStatus: EPaymentStatus.FAILED,
        failedAt: new Date(),
        cancelReason: 'payment_hold_expired',
      },
    })

    return true
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
      cancelReason: booking.cancelReason,
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
      { excludeTrialBookingId: excludeBookingId }
    )

    return { items }
  }

  async getOccupiedByTutorAndWeek(
    tutorId: string,
    weekStartYmd: string,
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

    const weekStart = dayjs.tz(weekStartYmd, timezoneName || 'UTC').startOf('day')
    if (!weekStart.isValid()) {
      throw new BadRequestException('Invalid week start date')
    }

    const items = await this.collectOccupiedSlotsForTutorWeek(
      tutor.id,
      weekStart.format('YYYY-MM-DD'),
      timezoneName,
      { excludeTrialBookingId: excludeBookingId }
    )

    return { items }
  }

  async collectOccupiedSlotsForTutorWeek(
    tutorId: string,
    weekStartYmd: string,
    timezoneName: string,
    options?: {
      excludeTrialBookingId?: string
      excludeSubscriptionSlot?: { enrollmentId: string; slotIndex: number }
    }
  ): Promise<{ id: string; startAt: string; durationMinutes: number; hold: boolean }[]> {
    const monday = dayjs.tz(weekStartYmd, timezoneName || 'UTC').startOf('day')
    if (!monday.isValid()) {
      throw new BadRequestException('Invalid week start date')
    }

    const all: { id: string; startAt: string; durationMinutes: number; hold: boolean }[] = []
    for (let i = 0; i < 7; i += 1) {
      const ymd = monday.add(i, 'day').format('YYYY-MM-DD')
      const dayStartLocal = dayjs.tz(`${ymd} 00:00`, timezoneName || 'UTC')
      const dayStart = dayStartLocal.utc().toDate()
      const dayEnd = dayStartLocal.add(1, 'day').utc().toDate()
      const items = await this.collectOccupiedSlotsForTutorDay(
        tutorId,
        dayStart,
        dayEnd,
        timezoneName,
        options
      )
      all.push(...items)
    }
    return all
  }

  async getStudentOccupiedByWeek(
    studentUserId: string,
    weekStartYmd: string,
    timezoneName: string,
    options?: {
      excludeTrialBookingId?: string
      excludeSubscriptionSlot?: { enrollmentId: string; slotIndex: number }
    }
  ) {
    const weekStart = dayjs.tz(weekStartYmd, timezoneName || 'UTC').startOf('day')
    if (!weekStart.isValid()) {
      throw new BadRequestException('Invalid week start date')
    }

    const items = await this.collectOccupiedSlotsForStudentWeek(
      studentUserId,
      weekStart.format('YYYY-MM-DD'),
      timezoneName,
      options
    )

    return { items }
  }

  async collectOccupiedSlotsForStudentWeek(
    studentUserId: string,
    weekStartYmd: string,
    timezoneName: string,
    options?: {
      excludeTrialBookingId?: string
      excludeSubscriptionSlot?: { enrollmentId: string; slotIndex: number }
    }
  ): Promise<{ id: string; startAt: string; durationMinutes: number; hold: boolean }[]> {
    const monday = dayjs.tz(weekStartYmd, timezoneName || 'UTC').startOf('day')
    if (!monday.isValid()) {
      throw new BadRequestException('Invalid week start date')
    }

    const all: { id: string; startAt: string; durationMinutes: number; hold: boolean }[] = []
    for (let i = 0; i < 7; i += 1) {
      const ymd = monday.add(i, 'day').format('YYYY-MM-DD')
      const dayStartLocal = dayjs.tz(`${ymd} 00:00`, timezoneName || 'UTC')
      const dayStart = dayStartLocal.utc().toDate()
      const dayEnd = dayStartLocal.add(1, 'day').utc().toDate()
      const items = await this.collectOccupiedSlotsForStudentDay(
        studentUserId,
        dayStart,
        dayEnd,
        timezoneName,
        options
      )
      all.push(...items)
    }
    return all
  }

  private async collectOccupiedSlotsForStudentDay(
    studentUserId: string,
    dayStart: Date,
    dayEnd: Date,
    timezoneName: string,
    options?: {
      excludeTrialBookingId?: string
      excludeSubscriptionSlot?: { enrollmentId: string; slotIndex: number }
    }
  ): Promise<{ id: string; startAt: string; durationMinutes: number; hold: boolean }[]> {
    const excludeBookingId = options?.excludeTrialBookingId
    const excludeSubscriptionSlot = options?.excludeSubscriptionSlot
    const [bookings, enrollments] = await Promise.all([
      this.prisma.trialLessonBooking.findMany({
        where: {
          studentId: studentUserId,
          ...this.slotBlockingTrialBookingWhere(),
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
          status: true,
          paymentStatus: true,
        },
        orderBy: { startAt: 'asc' },
      }),
      this.prisma.subscriptionEnrollment.findMany({
        where: {
          studentId: studentUserId,
          ...this.slotBlockingSubscriptionEnrollmentWhere(),
        },
        select: {
          id: true,
          status: true,
          paymentStatus: true,
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
      hold:
        booking.status === ETrialLessonStatus.PENDING &&
        booking.paymentStatus === EPaymentStatus.PENDING,
    }))

    const weekStartYmd = weekStartMondayYmd(dayjs(dayStart).tz(timezoneName), timezoneName)
    const subscriptionItems: {
      id: string
      startAt: string
      durationMinutes: number
      hold: boolean
    }[] = []

    for (const enrollment of enrollments) {
      const slots = this.parseEnrollmentWeeklySlots(enrollment.weeklySlots)
      const occurrences = subscriptionSlotsOccurrencesForWeek(
        weekStartYmd,
        slots,
        timezoneName,
        DEFAULT_TIMEZONE
      )
      for (const occ of occurrences) {
        const slot = slots[occ.slotIndex]
        if (
          normalizeSubscriptionSlotStatus(slot?.status) !==
          ESubscriptionLessonSlotStatus.SCHEDULED
        ) {
          continue
        }
        if (
          excludeSubscriptionSlot &&
          enrollment.id === excludeSubscriptionSlot.enrollmentId &&
          occ.slotIndex === excludeSubscriptionSlot.slotIndex
        ) {
          continue
        }
        if (occ.startAt >= dayStart && occ.startAt < dayEnd) {
          subscriptionItems.push({
            id: `sub-${enrollment.id}-${occ.slotIndex}`,
            startAt: occ.startAt.toISOString(),
            durationMinutes: Math.round(
              (occ.endAt.getTime() - occ.startAt.getTime()) / (60 * 1000)
            ),
            hold: this.isSubscriptionEnrollmentPaymentHold(enrollment),
          })
        }
      }
    }

    return [...trialItems, ...subscriptionItems].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    )
  }

  async assertStudentSlotAvailable(
    studentUserId: string,
    startAtIso: string,
    durationMinutes: number,
    timezoneName: string,
    options?: {
      excludeTrialBookingId?: string
      excludeSubscriptionSlot?: { enrollmentId: string; slotIndex: number }
      excludeSubscriptionEnrollmentId?: string
    }
  ): Promise<void> {
    const startAt = dayjs(startAtIso)
    if (!startAt.isValid()) {
      throw new BadRequestException('Invalid start time')
    }

    const excludeBookingId = options?.excludeTrialBookingId
    const newStart = startAt.toDate()
    const newEnd = startAt.add(durationMinutes, 'minute').toDate()
    const queryRangeStart = startAt.subtract(1, 'day').toDate()
    const queryRangeEnd = startAt.add(1, 'day').toDate()

    const existingBookings = await this.prisma.trialLessonBooking.findMany({
      where: {
        studentId: studentUserId,
        ...this.slotBlockingTrialBookingWhere(),
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
      throw new ConflictException('You already have a lesson scheduled at this time')
    }

    const enrollments = await this.prisma.subscriptionEnrollment.findMany({
      where: {
        studentId: studentUserId,
        ...this.slotBlockingSubscriptionEnrollmentWhere(),
      },
      select: {
        id: true,
        weeklySlots: true,
        tutor: { select: { user: { select: { timezone: true } } } },
      },
    })

    const weekStartYmd = weekStartMondayYmd(startAt, timezoneName)

    for (const enrollment of enrollments) {
      const slots = this.parseEnrollmentWeeklySlots(enrollment.weeklySlots)
      const slotStorageTimezone = DEFAULT_TIMEZONE

      const occurrences = subscriptionSlotsUseConcreteDates(slots)
        ? subscriptionConcreteOccurrencesSorted(slots, slotStorageTimezone)
        : subscriptionSlotsOccurrencesForWeek(
            weekStartYmd,
            slots,
            timezoneName,
            slotStorageTimezone
          )

      const hasSubscriptionOverlap = occurrences.some((occ) => {
        const slot = slots[occ.slotIndex]
        if (
          normalizeSubscriptionSlotStatus(slot?.status) !==
          ESubscriptionLessonSlotStatus.SCHEDULED
        ) {
          return false
        }
        if (this.isSubscriptionOccurrenceExcluded(enrollment.id, occ.slotIndex, options)) {
          return false
        }
        return this.rangesOverlap(newStart, newEnd, occ.startAt, occ.endAt)
      })

      if (hasSubscriptionOverlap) {
        throw new ConflictException('You already have a lesson scheduled at this time')
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
            slotStorageTimezone
          )
          if (
            adjacent.some((occ) => {
              const slot = slots[occ.slotIndex]
              if (
                normalizeSubscriptionSlotStatus(slot?.status) !==
                ESubscriptionLessonSlotStatus.SCHEDULED
              ) {
                return false
              }
              if (this.isSubscriptionOccurrenceExcluded(enrollment.id, occ.slotIndex, options)) {
                return false
              }
              return this.rangesOverlap(newStart, newEnd, occ.startAt, occ.endAt)
            })
          ) {
            throw new ConflictException('You already have a lesson scheduled at this time')
          }
        }
      }
    }
  }

  async assertTutorSlotAvailable(
    tutorId: string,
    startAtIso: string,
    durationMinutes: number,
    timezoneName: string,
    options?: {
      excludeTrialBookingId?: string
      excludeSubscriptionSlot?: { enrollmentId: string; slotIndex: number }
      excludeSubscriptionEnrollmentId?: string
    }
  ): Promise<void> {
    const startAt = dayjs(startAtIso)
    if (!startAt.isValid()) {
      throw new BadRequestException('Invalid start time')
    }
    await this.assertTrialSlotAvailableForTutor(
      tutorId,
      startAt,
      durationMinutes,
      timezoneName,
      options
    )
  }

  async checkTutorLessonSlotBookable(
    tutorId: string,
    startAtIso: string,
    durationMinutes: number,
    timezoneName: string,
    options?: {
      excludeTrialBookingId?: string
      excludeSubscriptionSlot?: { enrollmentId: string; slotIndex: number }
      excludeSubscriptionEnrollmentId?: string
    }
  ): Promise<
    | { available: true }
    | {
        available: false
        reason: 'SLOT_OCCUPIED' | 'SUBSCRIPTION_OVERLAP' | 'NOT_IN_AVAILABILITY' | 'INVALID_START_TIME'
      }
  > {
    const startAt = dayjs(startAtIso)
    if (!startAt.isValid()) {
      return { available: false, reason: 'INVALID_START_TIME' }
    }

    try {
      await this.assertTrialSlotAvailableForTutor(
        tutorId,
        startAt,
        durationMinutes,
        timezoneName,
        options
      )
      return { available: true }
    } catch (error) {
      if (error instanceof ConflictException) {
        const message = error.message.toLowerCase()
        if (message.includes('subscription')) {
          return { available: false, reason: 'SUBSCRIPTION_OVERLAP' }
        }
        return { available: false, reason: 'SLOT_OCCUPIED' }
      }
      if (error instanceof BadRequestException) {
        return { available: false, reason: 'NOT_IN_AVAILABILITY' }
      }
      throw error
    }
  }

  private async assertTutorLessonSlotBookableOrThrow(
    tutorId: string,
    startAtIso: string,
    durationMinutes: number,
    timezoneName: string,
    options?: {
      excludeTrialBookingId?: string
      excludeSubscriptionSlot?: { enrollmentId: string; slotIndex: number }
    }
  ): Promise<void> {
    const result = await this.checkTutorLessonSlotBookable(
      tutorId,
      startAtIso,
      durationMinutes,
      timezoneName,
      options
    )
    if (result.available) {
      return
    }
    if (result.reason === 'SLOT_OCCUPIED' || result.reason === 'SUBSCRIPTION_OVERLAP') {
      throw new ConflictException('Selected time overlaps an existing booking')
    }
    if (result.reason === 'INVALID_START_TIME') {
      throw new BadRequestException('Invalid start time')
    }
    throw new BadRequestException('Selected time is not available for this tutor')
  }

  async checkSubscriptionEnrollmentSlotsBookable(
    enrollmentId: string,
    tutorId: string,
    studentUserId: string,
    weeklySlotsJson: Prisma.JsonValue,
  ): Promise<{ available: true } | { available: false }> {
    const slots = this.parseEnrollmentWeeklySlots(weeklySlotsJson)
    if (slots.length === 0) {
      return { available: false }
    }

    if (!subscriptionSlotsUseConcreteDates(slots)) {
      return { available: false }
    }

    const slotStorageTimezone = DEFAULT_TIMEZONE
    const occurrences = subscriptionConcreteOccurrencesSorted(slots, slotStorageTimezone)
    const bookableOptions = { excludeSubscriptionEnrollmentId: enrollmentId }

    for (const occ of occurrences) {
      const slot = slots[occ.slotIndex]
      if (
        normalizeSubscriptionSlotStatus(slot?.status) !==
        ESubscriptionLessonSlotStatus.SCHEDULED
      ) {
        continue
      }
      const durationMinutes = slot?.durationMinutes ?? 60
      const result = await this.checkTutorLessonSlotBookable(
        tutorId,
        occ.startAt.toISOString(),
        durationMinutes,
        slotStorageTimezone,
        bookableOptions,
      )
      if (!result.available) {
        return { available: false }
      }

      try {
        await this.assertStudentSlotAvailable(
          studentUserId,
          occ.startAt.toISOString(),
          durationMinutes,
          slotStorageTimezone,
          bookableOptions,
        )
      } catch (error) {
        if (error instanceof ConflictException) {
          return { available: false }
        }
        throw error
      }
    }

    return { available: true }
  }

  async refundPaidSubscriptionEnrollmentDueToSlotConflict(
    enrollmentId: string,
  ): Promise<boolean> {
    const enrollment = await this.prisma.subscriptionEnrollment.findUnique({
      where: { id: enrollmentId },
      select: {
        id: true,
        studentId: true,
        grossAmount: true,
        tutorAmount: true,
        platformFee: true,
        paymentStatus: true,
      },
    })

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found')
    }

    if (enrollment.paymentStatus === EPaymentStatus.REFUNDED) {
      return true
    }

    if (enrollment.grossAmount > 0n) {
      await this.walletService.creditStudentRefund({
        studentUserId: enrollment.studentId,
        subscriptionEnrollmentId: enrollment.id,
        amount: enrollment.grossAmount,
        description: 'Refund: lesson slots were no longer available after payment',
        economics: transactionEconomicsFromGrossTutorFee(
          enrollment.grossAmount,
          enrollment.tutorAmount,
          enrollment.platformFee,
        ),
      })
    }

    await this.prisma.subscriptionEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: ESubscriptionEnrollmentStatus.CANCELLED,
        paymentStatus: EPaymentStatus.REFUNDED,
      },
    })

    this.googleCalendarSyncService.dispatchSubscriptionEnrollmentSync(enrollmentId)

    return true
  }

  async refundPaidBookingDueToSlotConflict(bookingId: string): Promise<boolean> {
    const booking = await this.prisma.trialLessonBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        studentId: true,
        grossAmount: true,
        tutorAmount: true,
        platformFee: true,
        paymentStatus: true,
      },
    })

    if (!booking) {
      throw new NotFoundException('Booking not found')
    }

    if (booking.paymentStatus === EPaymentStatus.REFUNDED) {
      return true
    }

    const now = new Date()

    if (booking.grossAmount > 0n) {
      await this.walletService.creditStudentRefund({
        studentUserId: booking.studentId,
        bookingId: booking.id,
        amount: booking.grossAmount,
        description: 'Refund: lesson slot was no longer available after payment',
        economics: transactionEconomicsFromGrossTutorFee(
          booking.grossAmount,
          booking.tutorAmount,
          booking.platformFee,
        ),
      })
    }

    await this.prisma.trialLessonBooking.update({
      where: { id: bookingId },
      data: {
        status: ETrialLessonStatus.CANCELLED,
        paymentStatus: EPaymentStatus.REFUNDED,
        refundedAt: now,
        cancelReason: LESSON_CANCEL_REASON_SLOT_CONFLICT,
      },
    })

    this.googleCalendarSyncService.dispatchTrialBookingSync(bookingId)

    return true
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
    options?: {
      excludeTrialBookingId?: string
      excludeSubscriptionSlot?: { enrollmentId: string; slotIndex: number }
    }
  ): Promise<{ id: string; startAt: string; durationMinutes: number; hold: boolean }[]> {
    const excludeBookingId = options?.excludeTrialBookingId
    const excludeSubscriptionSlot = options?.excludeSubscriptionSlot
    const [bookings, enrollments] = await Promise.all([
      this.prisma.trialLessonBooking.findMany({
        where: {
          tutorId,
          ...this.slotBlockingTrialBookingWhere(),
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
          status: true,
          paymentStatus: true,
        },
        orderBy: { startAt: 'asc' },
      }),
      this.prisma.subscriptionEnrollment.findMany({
        where: {
          tutorId,
          ...this.slotBlockingSubscriptionEnrollmentWhere(),
        },
        select: {
          id: true,
          status: true,
          paymentStatus: true,
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
      hold:
        booking.status === ETrialLessonStatus.PENDING &&
        booking.paymentStatus === EPaymentStatus.PENDING,
    }))

    const weekStartYmd = weekStartMondayYmd(dayjs(dayStart).tz(timezoneName), timezoneName)
    const subscriptionItems: {
      id: string
      startAt: string
      durationMinutes: number
      hold: boolean
    }[] = []

    for (const enrollment of enrollments) {
      const slots = this.parseEnrollmentWeeklySlots(enrollment.weeklySlots)
      const occurrences = subscriptionSlotsOccurrencesForWeek(
        weekStartYmd,
        slots,
        timezoneName,
        DEFAULT_TIMEZONE
      )
      for (const occ of occurrences) {
        const slot = slots[occ.slotIndex]
        if (
          normalizeSubscriptionSlotStatus(slot?.status) !==
          ESubscriptionLessonSlotStatus.SCHEDULED
        ) {
          continue
        }
        if (
          excludeSubscriptionSlot &&
          enrollment.id === excludeSubscriptionSlot.enrollmentId &&
          occ.slotIndex === excludeSubscriptionSlot.slotIndex
        ) {
          continue
        }
        if (occ.startAt >= dayStart && occ.startAt < dayEnd) {
          subscriptionItems.push({
            id: `sub-${enrollment.id}-${occ.slotIndex}`,
            startAt: occ.startAt.toISOString(),
            durationMinutes: Math.round(
              (occ.endAt.getTime() - occ.startAt.getTime()) / (60 * 1000)
            ),
            hold: this.isSubscriptionEnrollmentPaymentHold(enrollment),
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
    options?: {
      excludeTrialBookingId?: string
      excludeSubscriptionSlot?: { enrollmentId: string; slotIndex: number }
      excludeSubscriptionEnrollmentId?: string
    }
  ): Promise<void> {
    const excludeBookingId = options?.excludeTrialBookingId
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
        ...this.slotBlockingTrialBookingWhere(),
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
        ...this.slotBlockingSubscriptionEnrollmentWhere(),
      },
      select: {
        id: true,
        weeklySlots: true,
        tutor: { select: { user: { select: { timezone: true } } } },
      },
    })

    const weekStartYmd = weekStartMondayYmd(startAt, timezoneName)

    for (const enrollment of enrollments) {
      const slots = this.parseEnrollmentWeeklySlots(enrollment.weeklySlots)
      const slotStorageTimezone = DEFAULT_TIMEZONE

      const occurrences = subscriptionSlotsUseConcreteDates(slots)
        ? subscriptionConcreteOccurrencesSorted(slots, slotStorageTimezone)
        : subscriptionSlotsOccurrencesForWeek(
            weekStartYmd,
            slots,
            timezoneName,
            slotStorageTimezone
          )

      const hasSubscriptionOverlap = occurrences.some((occ) => {
        const slot = slots[occ.slotIndex]
        if (
          normalizeSubscriptionSlotStatus(slot?.status) !==
          ESubscriptionLessonSlotStatus.SCHEDULED
        ) {
          return false
        }
        if (this.isSubscriptionOccurrenceExcluded(enrollment.id, occ.slotIndex, options)) {
          return false
        }
        return this.rangesOverlap(newStart, newEnd, occ.startAt, occ.endAt)
      })

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
            slotStorageTimezone
          )
          if (
            adjacent.some((occ) => {
              const slot = slots[occ.slotIndex]
              if (
                normalizeSubscriptionSlotStatus(slot?.status) !==
                ESubscriptionLessonSlotStatus.SCHEDULED
              ) {
                return false
              }
              if (this.isSubscriptionOccurrenceExcluded(enrollment.id, occ.slotIndex, options)) {
                return false
              }
              return this.rangesOverlap(newStart, newEnd, occ.startAt, occ.endAt)
            })
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
    await this.expireStalePendingPaymentBookings()

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
            username: true,
          },
        },
      } as unknown as Prisma.TutorProfileInclude,
    }) as unknown as {
      id: string
      userId: string
      firstName: string
      lastName: string
      verificationStatus: VerificationStatus
      trialLessonPrice?: { usd: Prisma.Decimal; vnd: bigint; php: Prisma.Decimal } | null
      user?: { timezone: string; username: string } | null
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
    await this.assertTutorLessonSlotBookableOrThrow(
      tutor.id,
      startAt.toISOString(),
      dto.durationMinutes,
      viewerTimezone
    )
    await this.assertStudentSlotAvailable(
      studentId,
      startAt.toISOString(),
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
    const settings = await this.appSettingsService.getSettings()
    const { platformFee, tutorAmount } = calculatePlatformFeeAmounts(
      grossAmount,
      settings.platformFeePercentage,
    )

    const walletBalance =
      await this.walletCheckoutService.getStudentWalletBalance(studentId)
    const { deductAmount, vnpayAmount } =
      this.walletCheckoutService.resolveWalletCheckoutSplit({
        grossAmount,
        walletBalance,
        useWalletBalance: dto.useWalletBalance ?? false,
        currency: selectedCurrency,
      })
    this.walletCheckoutService.assertSufficientWalletBalance(
      walletBalance,
      deductAmount,
    )

    const gatewayAmountNumber = Number(vnpayAmount)
    const paymentProvider = this.paymentCheckoutService.resolveProvider(dto.paymentProvider)
    if (vnpayAmount > 0n) {
      this.paymentCheckoutService.assertGatewayConfigured(paymentProvider)
      if (!Number.isFinite(gatewayAmountNumber) || gatewayAmountNumber < 1) {
        throw new BadRequestException('Invalid payment amount for this lesson')
      }
    }

    if (vnpayAmount === 0n) {
      return this.createTrialLessonBookingPaidByWallet({
        tutorId: tutor.id,
        tutorUserId: tutor.userId,
        studentId,
        startAt: startAt.toDate(),
        durationMinutes: dto.durationMinutes,
        grossAmount,
        platformFee,
        tutorAmount,
        deductAmount,
        currency: selectedCurrency,
        timezoneName: viewerTimezone,
      })
    }

    await this.assertTutorLessonSlotBookableOrThrow(
      tutor.id,
      startAt.toISOString(),
      dto.durationMinutes,
      viewerTimezone
    )

    const booking = await this.prisma.trialLessonBooking.create({
      data: {
        tutorId: tutor.id,
        studentId,
        startAt: startAt.toDate(),
        durationMinutes: dto.durationMinutes,
        grossAmount,
        platformFee,
        tutorAmount,
        deductAmount,
        currency: selectedCurrency,
        status: ETrialLessonStatus.PENDING,
        paymentStatus: EPaymentStatus.PENDING,
      },
      select: { id: true },
    })

    const description = buildTrialLessonPaymentDescription({
      bookingId: booking.id,
      startAt: startAt.toDate(),
      tutorName: formatTutorDisplayName({
        firstName: tutor.firstName,
        lastName: tutor.lastName,
        username: tutor.user?.username,
      }),
      timezone: viewerTimezone,
    })
    const checkout = await this.paymentCheckoutService.createCheckout({
      provider: paymentProvider,
      resourceId: booking.id,
      amount: gatewayAmountNumber,
      description,
      checkoutKind: 'trial',
      clientIp,
    })

    const updated = await this.prisma.trialLessonBooking.update({
      where: { id: booking.id },
      data: {
        paymentRef: checkout.paymentRef,
        paymentUrl: checkout.paymentUrl,
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
        deductAmount: true,
        paymentRef: true,
        paymentUrl: true,
        createdAt: true,
      },
    })

    return this.serializeTrialLessonBookingResponse(updated, checkout.paymentProvider)
  }

  private async createTrialLessonBookingPaidByWallet(params: {
    tutorId: string
    tutorUserId: string
    studentId: string
    startAt: Date
    durationMinutes: number
    grossAmount: bigint
    platformFee: bigint
    tutorAmount: bigint
    deductAmount: bigint
    currency: ECurrency
    timezoneName: string
  }) {
    const now = new Date()

    await this.assertTutorLessonSlotBookableOrThrow(
      params.tutorId,
      params.startAt.toISOString(),
      params.durationMinutes,
      params.timezoneName
    )

    const booking = await this.prisma.$transaction(async (tx) => {
      const created = await tx.trialLessonBooking.create({
        data: {
          tutorId: params.tutorId,
          studentId: params.studentId,
          startAt: params.startAt,
          durationMinutes: params.durationMinutes,
          grossAmount: params.grossAmount,
          platformFee: params.platformFee,
          tutorAmount: params.tutorAmount,
          deductAmount: params.deductAmount,
          currency: params.currency,
          status: ETrialLessonStatus.CONFIRMED,
          paymentStatus: EPaymentStatus.SUCCEEDED,
          paidAt: now,
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
          deductAmount: true,
          paymentRef: true,
          paymentUrl: true,
        },
      })

      await this.walletCheckoutService.debitStudentForTrialBooking(tx, {
        studentUserId: params.studentId,
        bookingId: created.id,
        deductAmount: params.deductAmount,
        economics: transactionEconomicsFromGrossTutorFee(
          params.grossAmount,
          params.tutorAmount,
          params.platformFee,
        ),
      })
      await this.walletCheckoutService.creditTutorForTrialBooking(tx, {
        tutorUserId: params.tutorUserId,
        bookingId: created.id,
        tutorAmount: params.tutorAmount,
        economics: transactionEconomicsFromGrossTutorFee(
          params.grossAmount,
          params.tutorAmount,
          params.platformFee,
        ),
      })

      return created
    })

    await this.notificationService.notifyStudentBookingConfirmed({
      studentId: params.studentId,
      bookingId: booking.id,
      tutorProfileId: params.tutorId,
    })
    await this.lessonSettlementService.scheduleTrialLessonSettlement(booking.id)
    this.googleCalendarSyncService.dispatchTrialBookingSync(booking.id)

    return this.serializeTrialLessonBookingResponse(booking, EPaymentProvider.VNPAY)
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
    deductAmount: bigint
    paymentRef: string | null
    paymentUrl: string | null
    createdAt?: Date
  },
    paymentProvider: EPaymentProvider = inferPaymentProviderFromUrl(booking.paymentUrl),
  ) {
    const paymentExpiresAt =
      booking.status === ETrialLessonStatus.PENDING &&
      booking.paymentStatus === EPaymentStatus.PENDING &&
      booking.createdAt
        ? trialLessonPaymentHoldExpiresAt(booking.createdAt).toISOString()
        : null

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
      deductAmount: Number(booking.deductAmount),
      currency: booking.currency,
      paymentProvider,
      paymentUrl: booking.paymentUrl,
      paymentRef: booking.paymentRef,
      paymentExpiresAt,
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
    const [booking, { lessonChangePeriodHours }] = await Promise.all([
      this.prisma.trialLessonBooking.findUnique({
        where: { id: bookingId },
        include: {
          tutor: {
            select: {
              id: true,
              user: { select: { timezone: true } },
            },
          },
        },
      }),
      this.appSettingsService.getSettings(),
    ])

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
    if (hoursUntilStart <= lessonChangePeriodHours) {
      throw new BadRequestException(
        `Cannot reschedule within ${lessonChangePeriodHours} hours of the lesson. Please contact your tutor.`
      )
    }

    const startAt = dayjs(dto.startAt)
    if (!startAt.isValid()) {
      throw new BadRequestException('Invalid start time')
    }

    if (startAt.isBefore(dayjs())) {
      throw new BadRequestException('Cannot reschedule to a time in the past')
    }
    const hoursUntilNewStart = startAt.utc().diff(dayjs().utc(), 'hour', true)
    if (hoursUntilNewStart <= lessonChangePeriodHours) {
      throw new BadRequestException(
        `Cannot reschedule to a time within ${lessonChangePeriodHours} hours from now. Please choose a later slot.`
      )
    }

    const tz = timezoneName?.trim() || booking.tutor.user?.timezone || 'UTC'
    await Promise.all([
      this.assertTrialSlotAvailableForTutor(
        booking.tutorId,
        startAt,
        dto.durationMinutes,
        tz,
        { excludeTrialBookingId: booking.id }
      ),
      this.assertStudentSlotAvailable(
        studentUserId,
        startAt.toISOString(),
        dto.durationMinutes,
        tz,
        { excludeTrialBookingId: booking.id }
      ),
    ])

    const originalStartAt = booking.startAt

    await this.prisma.$transaction(async (tx) => {
      await tx.trialLessonBooking.update({
        where: { id: booking.id },
        data: {
          startAt: startAt.toDate(),
          durationMinutes: dto.durationMinutes,
        },
      })

      await tx.cancelRescheduleReason.create({
        data: {
          studentId: booking.studentId,
          tutorId: booking.tutorId,
          initiatedByUserId: studentUserId,
          initiatedByRole: ELessonChangeInitiatorRole.STUDENT,
          action: ELessonChangeAction.RESCHEDULE,
          lessonType: ELessonChangeLessonType.TRIAL,
          reason: 'studentTrialReschedule',
          message: null,
          trialLessonBookingId: booking.id,
          originalStartAt,
          originalDurationMinutes: booking.durationMinutes,
        },
      })

      const lessonEndAt = addMinutes(startAt.toDate(), dto.durationMinutes)
      const completionRunAt = addMinutes(lessonEndAt, LESSON_AUTO_COMPLETE_GRACE_MINUTES)
      await tx.lessonCompletionJob.updateMany({
        where: {
          bookingId: booking.id,
          status: ELessonSettlementJobStatus.PENDING,
        },
        data: {
          runAt: completionRunAt,
        },
      })
    })

    this.googleCalendarSyncService.dispatchTrialBookingSync(booking.id)

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

    const reason = payload?.reason?.trim()
    if (!reason) {
      throw new BadRequestException('Cancellation reason is required')
    }

    return this.applyTrialLessonCancellation(booking.id, {
      refundIfEligible: true,
      cancelReason: reason,
      cancelMessage: payload?.message?.trim() || null,
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

    const { lessonChangePeriodHours } = await this.appSettingsService.getSettings()
    const hoursUntilStart = dayjs(booking.startAt).utc().diff(dayjs().utc(), 'hour', true)
    if (hoursUntilStart <= lessonChangePeriodHours) {
      throw new BadRequestException(
        `Cannot request reschedule within ${lessonChangePeriodHours} hours of the lesson start time`
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

  /**
   * Tutor cancels a confirmed trial lesson: cancels booking, refunds student, updates tutor pending balance.
   */
  async tutorRequestCancelTrialLesson(
    tutorUserId: string,
    bookingId: string,
    payload: { reason: string; message?: string }
  ): Promise<{ success: true; refunded: boolean; refundAmount: number; currency: string }> {
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
        status: true,
        tutor: {
          select: {
            user: { select: { username: true } },
          },
        },
      },
    })

    if (!booking) {
      throw new NotFoundException('Booking not found')
    }

    if (booking.tutorId !== tutor.id) {
      throw new ForbiddenException('Not allowed to cancel this booking')
    }

    if (booking.status !== ETrialLessonStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed lessons can be cancelled')
    }

    const reason = payload.reason?.trim()
    if (!reason) {
      throw new BadRequestException('Cancellation reason is required')
    }

    const tutorLabel = booking.tutor.user.username ?? 'tutor'
    const result = await this.applyTrialLessonCancellation(booking.id, {
      refundIfEligible: true,
      forceRefund: true,
      cancelReason: reason,
      cancelMessage: payload.message?.trim() || null,
      refundDescription: `Refund for trial lesson cancelled by tutor ${tutorLabel}`,
      initiatedByUserId: tutorUserId,
      initiatedByRole: ELessonChangeInitiatorRole.TUTOR,
    })

    return {
      success: true,
      refunded: result.refunded,
      refundAmount: result.refundAmount,
      currency: result.currency,
    }
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
      forceRefund?: boolean
      cancelReason: string | null
      cancelMessage: string | null
      refundDescription?: string
      requireRefundIfPaid?: boolean
      initiatedByUserId?: string
      initiatedByRole?: ELessonChangeInitiatorRole
    }
  ): Promise<{ refunded: boolean; refundAmount: number; currency: string }> {
    const booking = await this.prisma.trialLessonBooking.findUnique({
      where: { id: bookingId },
    })

    if (!booking) {
      throw new NotFoundException('Booking not found')
    }

    if (booking.status === ETrialLessonStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled')
    }

    const { lessonChangePeriodHours } = await this.appSettingsService.getSettings()
    const hoursUntilStart = dayjs(booking.startAt).utc().diff(dayjs().utc(), 'hour', true)
    const paymentRefundable = this.isTrialLessonPaymentRefundable(booking)
    const withinRefundWindow =
      options.forceRefund === true || hoursUntilStart > lessonChangePeriodHours
    const shouldRefund =
      options.refundIfEligible && withinRefundWindow && paymentRefundable

    let refunded = false
    if (shouldRefund) {
      refunded = await this.walletService.refundTrialLessonBooking(booking.id, {
        refundDescription: options.refundDescription,
      })
    }

    if (options.requireRefundIfPaid && withinRefundWindow && paymentRefundable && !refunded) {
      throw new BadRequestException(
        'Lesson was cancelled but payment could not be refunded to the student wallet'
      )
    }

    const reasonTrimmed = options.cancelReason?.trim() ?? ''
    const messageTrimmed = options.cancelMessage?.trim() || null

    await this.prisma.$transaction(async (tx) => {
      await tx.trialLessonBooking.update({
        where: { id: booking.id },
        data: {
          status: ETrialLessonStatus.CANCELLED,
          cancelReason: reasonTrimmed || null,
          cancelMessage: messageTrimmed,
        },
      })

      if (reasonTrimmed) {
        await tx.cancelRescheduleReason.create({
          data: {
            studentId: booking.studentId,
            tutorId: booking.tutorId,
            initiatedByUserId: options.initiatedByUserId ?? booking.studentId,
            initiatedByRole:
              options.initiatedByRole ?? ELessonChangeInitiatorRole.STUDENT,
            action: ELessonChangeAction.CANCEL,
            lessonType: ELessonChangeLessonType.TRIAL,
            reason: reasonTrimmed,
            message: messageTrimmed,
            trialLessonBookingId: booking.id,
            originalStartAt: booking.startAt,
            originalDurationMinutes: booking.durationMinutes,
          },
        })
      }

      await tx.lessonCompletionJob.updateMany({
        where: {
          bookingId: booking.id,
          status: ELessonSettlementJobStatus.PENDING,
        },
        data: {
          status: ELessonSettlementJobStatus.CANCELLED,
          processedAt: new Date(),
        },
      })
    })

    this.googleCalendarSyncService.dispatchTrialBookingSync(booking.id)

    return {
      refunded,
      refundAmount: refunded ? Number(booking.grossAmount) : 0,
      currency: booking.currency,
    }
  }
}
