import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Res } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Response } from 'express'
import { SkipApiResponseWrap } from '../../common/decorators/skip-api-response-wrap.decorator'
import { WebhookService } from './webhook.service'

@Controller('webhook')
@ApiTags('Webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @SkipApiResponseWrap()
  @Get('vnpay/trial-lesson/return')
  async handleVnpayTrialLessonReturn(
    @Query() query: Record<string, string | string[] | undefined>,
    @Res() res: Response
  ) {
    const url = await this.webhookService.buildTrialLessonVnpayReturnRedirectUrl(query)
    return res.redirect(302, url)
  }

  @SkipApiResponseWrap()
  @Get('vnpay/subscription-enrollment/return')
  async handleVnpaySubscriptionEnrollmentReturn(
    @Query() query: Record<string, string | string[] | undefined>,
    @Res() res: Response
  ) {
    const url = await this.webhookService.buildSubscriptionEnrollmentVnpayReturnRedirectUrl(query)
    return res.redirect(302, url)
  }

  @Get('vnpay/return')
  handleVnpayReturn(@Query() query: Record<string, string | string[] | undefined>) {
    return this.webhookService.handleVnpayReturn(query)
  }

  @Get('vnpay/ipn')
  handleVnpayIpn(@Query() query: Record<string, string | string[] | undefined>) {
    return this.webhookService.handleVnpayIpn(query)
  }

  @SkipApiResponseWrap()
  @Get('payos/trial-lesson/return')
  async handlePayosTrialLessonReturn(
    @Query() query: Record<string, string | string[] | undefined>,
    @Res() res: Response
  ) {
    const url = await this.webhookService.buildTrialLessonPayosReturnRedirectUrl(query)
    return res.redirect(302, url)
  }

  @SkipApiResponseWrap()
  @Get('payos/trial-lesson/cancel')
  async handlePayosTrialLessonCancel(
    @Query() query: Record<string, string | string[] | undefined>,
    @Res() res: Response
  ) {
    const url = await this.webhookService.buildTrialLessonPayosCancelRedirectUrl(query)
    return res.redirect(302, url)
  }

  @SkipApiResponseWrap()
  @Get('payos/subscription-enrollment/return')
  async handlePayosSubscriptionEnrollmentReturn(
    @Query() query: Record<string, string | string[] | undefined>,
    @Res() res: Response
  ) {
    const url = await this.webhookService.buildSubscriptionEnrollmentPayosReturnRedirectUrl(query)
    return res.redirect(302, url)
  }

  @SkipApiResponseWrap()
  @Get('payos/subscription-enrollment/cancel')
  async handlePayosSubscriptionEnrollmentCancel(
    @Query() query: Record<string, string | string[] | undefined>,
    @Res() res: Response
  ) {
    const url = await this.webhookService.buildSubscriptionEnrollmentPayosCancelRedirectUrl(query)
    return res.redirect(302, url)
  }

  @SkipApiResponseWrap()
  @Post('payos/ipn')
  @HttpCode(HttpStatus.OK)
  handlePayosIpn(@Body() body: unknown) {
    return this.webhookService.handlePayosIpn(body)
  }
}
