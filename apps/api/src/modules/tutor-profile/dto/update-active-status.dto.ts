import { IsBoolean } from 'class-validator';

export class UpdateActiveStatusBodyDto {
  @IsBoolean()
  activeStatus: boolean;
}
