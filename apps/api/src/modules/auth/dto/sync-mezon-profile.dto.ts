import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

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
}
