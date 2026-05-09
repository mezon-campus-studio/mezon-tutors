import { Type } from 'class-transformer'
import { IsInt, IsOptional, Max, Min } from 'class-validator'

export class GetMyNotificationsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip: number = 0

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take: number = 20
}
