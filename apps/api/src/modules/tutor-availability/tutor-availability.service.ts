import { Injectable, NotFoundException } from '@nestjs/common'
import type { TutorScheduleDto } from '@mezon-tutors/shared'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class TutorAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getByTutorId(tutorId: string): Promise<TutorScheduleDto & { timezone?: string }> {
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { id: tutorId },
      select: {
        id: true,
        user: {
          select: {
            timezone: true,
          },
        },
      },
    })

    if (!tutor) {
      throw new NotFoundException(`Tutor with ID ${tutorId} not found`)
    }

    const availability = await this.prisma.tutorAvailability.findMany({
      where: {
        tutorId,
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
      timezone: tutor.user?.timezone ?? 'UTC',
    }
  }
}
