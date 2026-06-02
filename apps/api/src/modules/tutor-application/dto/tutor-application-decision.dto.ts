import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class TutorApplicationDecisionDto {
  @ApiPropertyOptional({
    description: 'Optional message included in the decision email (not stored in DB)',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
