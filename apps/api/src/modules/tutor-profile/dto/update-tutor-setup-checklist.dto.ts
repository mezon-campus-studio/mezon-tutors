import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateTutorSetupChecklistBodyDto {
  @IsOptional()
  @IsBoolean()
  createMezonClanComplete?: boolean;

  @IsOptional()
  @IsBoolean()
  channelAppsComplete?: boolean;
}
