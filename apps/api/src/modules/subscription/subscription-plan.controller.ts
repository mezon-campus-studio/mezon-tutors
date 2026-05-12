import { Controller, Get, Query, ParseUUIDPipe } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { TutorSubscriptionPlanDto } from '@mezon-tutors/shared'
import { SubscriptionService } from './subscription.service'

@Controller('subscription-plans')
@ApiTags('Subscription plans')
export class SubscriptionPlanController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  async listByTutor(@Query('tutorId', ParseUUIDPipe) tutorId: string): Promise<TutorSubscriptionPlanDto[]> {
    return this.subscriptionService.listPlansByTutorProfileId(tutorId)
  }
}
