import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MezonExchangeDto {
  @ApiProperty({
    description: 'Authorization code returned from Mezon OAuth',
  })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({
    description: 'State parameter from the authorization redirect; must match the value issued with /auth/url',
  })
  @IsString()
  @IsNotEmpty()
  state!: string;

  @ApiPropertyOptional({
    description: 'Timezone of the user detected from browser',
    example: 'Asia/Ho_Chi_Minh',
  })
  @IsString()
  @IsOptional()
  timezone?: string;
}

