import { Controller, Get, Put, Body, Query, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import type { AuthUserPayload } from '../auth/interfaces/auth.interfaces'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import type { TutorSubscriptionPlanDto } from '@mezon-tutors/shared'
import { SubscriptionService } from './subscription.service'
import { ReplaceTutorSubscriptionPlansBodyDto } from './dto/replace-tutor-subscription-plans.dto'

@Controller('subscription-plans')
@ApiTags('Subscription plans')
export class SubscriptionPlanController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  async listByTutor(@Query('tutorId', ParseUUIDPipe) tutorId: string): Promise<TutorSubscriptionPlanDto[]> {
    return this.subscriptionService.listPlansByTutorProfileId(tutorId)
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async listMine(@Req() req: Request): Promise<TutorSubscriptionPlanDto[]> {
    const user = req.user as AuthUserPayload
    return this.subscriptionService.listMyPlans(user.sub)
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  async replaceMine(
    @Req() req: Request,
    @Body() body: ReplaceTutorSubscriptionPlansBodyDto
  ): Promise<TutorSubscriptionPlanDto[]> {
    const user = req.user as AuthUserPayload
    return this.subscriptionService.replaceMyPlans(user.sub, body)
  }
}
