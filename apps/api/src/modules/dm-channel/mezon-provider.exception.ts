import { BadGatewayException, HttpException, HttpStatus } from '@nestjs/common';

export const MEZON_AUTH_EXPIRED_CODE = 'MEZON_AUTH_EXPIRED';

export class MezonAuthExpiredException extends HttpException {
  constructor() {
    super(
      {
        code: MEZON_AUTH_EXPIRED_CODE,
        message: 'Mezon session is invalid or expired',
      },
      HttpStatus.FAILED_DEPENDENCY
    );
  }
}

export function createMezonProviderException(status: number): HttpException {
  if (status === HttpStatus.UNAUTHORIZED || status === HttpStatus.FORBIDDEN) {
    return new MezonAuthExpiredException();
  }
  return new BadGatewayException('Mezon is temporarily unavailable');
}
