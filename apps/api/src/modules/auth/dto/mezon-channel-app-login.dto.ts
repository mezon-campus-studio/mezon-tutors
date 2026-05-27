import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class MezonChannelAppLoginDto {
  @ApiProperty({
    description: 'Base64-encoded signed query string from Mezon Channel App (?data=...)',
  })
  @IsString()
  @IsNotEmpty()
  hashData!: string;
}
