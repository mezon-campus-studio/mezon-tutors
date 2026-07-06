import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { SkipApiResponseWrap } from '../../common/decorators/skip-api-response-wrap.decorator';
import { WebhookService } from './webhook.service';

type GatewayQuery = Record<string, string | string[] | undefined>;

@SkipThrottle()
@Controller('webhook')
@ApiTags('Webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @SkipApiResponseWrap()
  @Get(':gateway/:checkoutKind/:outcome')
  async handleLessonCheckoutRedirect(
    @Param('gateway') gateway: string,
    @Param('checkoutKind') checkoutKind: string,
    @Param('outcome') outcome: string,
    @Query() query: GatewayQuery,
    @Res() res: Response,
  ) {
    const url = await this.webhookService.buildLessonCheckoutRedirectUrl(
      gateway,
      checkoutKind,
      outcome,
      query,
    );
    return res.redirect(302, url);
  }

  @Get('vnpay/return')
  handleVnpayReturn(@Query() query: GatewayQuery) {
    return this.webhookService.handleVnpayReturn(query);
  }

  @Get('vnpay/ipn')
  handleVnpayIpn(@Query() query: GatewayQuery) {
    return this.webhookService.handleVnpayIpn(query);
  }

  @SkipApiResponseWrap()
  @Post(':gateway/ipn')
  @HttpCode(HttpStatus.OK)
  handleGatewayIpn(
    @Param('gateway') gateway: string,
    @Body() body: unknown,
    @Headers('x-secret-key') secretKeyHeader: string | undefined,
  ) {
    return this.webhookService.handleGatewayIpn(gateway, body, secretKeyHeader);
  }
}
