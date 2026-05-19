import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SyncMezonProfileDto {
  @ApiProperty({ description: 'Authorization code from Mezon OAuth redirect' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({
    description: 'State from Mezon redirect; must match oauth_state cookie from /auth/url',
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
