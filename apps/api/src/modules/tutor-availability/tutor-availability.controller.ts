import { Controller, Get, Param } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { TutorScheduleDto } from '@mezon-tutors/shared'
import { TutorAvailabilityService } from './tutor-availability.service'

@Controller('tutor-availability')
@ApiTags('Tutor Availability')
export class TutorAvailabilityController {
  constructor(private readonly tutorAvailabilityService: TutorAvailabilityService) {}

  @Get(':tutorId')
  async getTutorAvailability(
    @Param('tutorId') tutorId: string,
  ): Promise<TutorScheduleDto & { timezone?: string }> {
    return this.tutorAvailabilityService.getByTutorId(tutorId)
  }
}
