import {
  PLATFORM_FEE_PERCENTAGE,
  timeToMinutes,
  utcDateToHHmm,
  utcDateToMinutes,
  type PaginatedResponse,
} from '@mezon-tutors/shared'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ECurrency, EPaymentStatus, ETrialLessonStatus, VerificationStatus } from '@mezon-tutors/db'
import { Prisma } from '@mezon-tutors/db'
import dayjs = require('dayjs')
import { PrismaService } from '../../prisma/prisma.service'
import { AppConfigService } from '../../shared/services/app-config.service'
import { VnpayService } from '../vnpay/vnpay.service'
import { CreateTrialLessonBookingDto } from './dto/create-trial-lesson-booking.dto'
import type { TutorTrialLessonBookingRequestDto } from './dto/tutor-trial-lesson-booking-request.dto'
import type { TrialLessonBookingDetailDto } from './dto/trial-lesson-booking-detail.dto'

@Injectable()
export class TrialLessonBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vnpayService: VnpayService,
    private readonly appConfig: AppConfigService
  ) {}

  async getTutorBookingRequests(
    tutorUserId: string,
    options?: {
      status?: ETrialLessonStatus
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
    const where = {
      tutorId: tutor.id,
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.trialLessonBooking.count({ where }),
      this.prisma.trialLessonBooking.findMany({
        where,
        include: {
          student: {
            select: {
              username: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])
    const totalPages = Math.ceil(total / limit)
    return {
      data: {
        items: items.map((item) => ({
          id: item.id,
          studentName: item.student.username,
          studentAvatarUrl: item.student.avatar,
          startAt: item.startAt.toISOString(),
          durationMinutes: item.durationMinutes,
          grossAmount: Number(item.grossAmount),
          platformFee: Number(item.platformFee),
          tutorAmount: Number(item.tutorAmount),
          status: item.status,
          createdAt: item.createdAt.toISOString(),
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
            timezone: true,
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
        timezone: booking.tutor.timezone,
      },
      student: {
        id: booking.student.id,
        displayName: booking.student.username,
        avatarUrl: booking.student.avatar,
        email: booking.student.email,
      },
    }
  }

  async getAcceptedByTutorAndDate(tutorId: string, date: string) {
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { id: tutorId },
      select: { id: true },
    })

    if (!tutor) {
      throw new NotFoundException(`Tutor with ID ${tutorId} not found`)
    }

    const dayStart = dayjs(`${date}T00:00:00Z`)
    if (!dayStart.isValid()) {
      throw new BadRequestException('Invalid date')
    }

    const dayEnd = dayStart.add(1, 'day')

    const bookings = await this.prisma.trialLessonBooking.findMany({
      where: {
        tutorId,
        status: ETrialLessonStatus.CONFIRMED,
        startAt: {
          gte: dayStart.toDate(),
          lt: dayEnd.toDate(),
        },
      },
      select: {
        id: true,
        startAt: true,
        durationMinutes: true,
      },
      orderBy: {
        startAt: 'asc',
      },
    })

    return {
      items: bookings.map((booking) => ({
        id: booking.id,
        startTime: utcDateToHHmm(booking.startAt),
        durationMinutes: booking.durationMinutes,
      })),
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
        throw new ConflictException('Request already sent. Please wait for confirmation')
      }
      throw new ConflictException('You have already booked a trial lesson with this tutor')
    }

    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { id: dto.tutorId },
      include: {
        trialLessonPrice: true,
      } as unknown as Prisma.TutorProfileInclude,
    }) as unknown as {
      id: string
      verificationStatus: VerificationStatus
      trialLessonPrice?: { usd: Prisma.Decimal; vnd: bigint; php: Prisma.Decimal } | null
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

    const startMinutes = utcDateToMinutes(startAt.toDate())
    const endMinutes = startMinutes + dto.durationMinutes

    const availability = await this.prisma.tutorAvailability.findMany({
      where: {
        tutorId: tutor.id,
        dayOfWeek: dto.dayOfWeek,
        isActive: true,
      },
      orderBy: { startTime: 'asc' },
    })

    const matchedAvailability = availability.find((slot) => {
      const slotStart = timeToMinutes(slot.startTime)
      const slotEnd = timeToMinutes(slot.endTime)
      return startMinutes >= slotStart && endMinutes <= slotEnd
    })

    if (!matchedAvailability) {
      throw new BadRequestException('Selected time is not available for this tutor')
    }

    const dayStart = startAt.startOf('day')
    const dayEnd = dayStart.add(1, 'day')
    const existingBookings = await this.prisma.trialLessonBooking.findMany({
      where: {
        tutorId: tutor.id,
        status: {
          in: [ETrialLessonStatus.PENDING, ETrialLessonStatus.CONFIRMED],
        },
        startAt: {
          gte: dayStart.toDate(),
          lt: dayEnd.toDate(),
        },
      },
      select: {
        id: true,
        startAt: true,
        durationMinutes: true,
      },
    })

    const hasOverlap = existingBookings.some((booking) => {
      const bookedStartMinutes = utcDateToMinutes(booking.startAt)
      const bookedEndMinutes = bookedStartMinutes + booking.durationMinutes
      return startMinutes < bookedEndMinutes && endMinutes > bookedStartMinutes
    })

    if (hasOverlap) {
      throw new ConflictException('Selected time overlaps an existing booking')
    }

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
}
