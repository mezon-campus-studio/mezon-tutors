import { Type } from 'class-transformer'
import { IsInt, Min, Max, IsOptional } from 'class-validator'

export class PaginationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10
}
