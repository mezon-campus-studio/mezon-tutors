import { Transform } from 'class-transformer'
import { IsArray, IsEnum, IsOptional } from 'class-validator'
import { ETrialLessonStatus } from '@mezon-tutors/db'
import { PaginationDto } from '../../../common/dto/pagination.dto'

export class GetMyTrialLessonBookingsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ETrialLessonStatus)
  status?: ETrialLessonStatus

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined
    }
    const raw = Array.isArray(value) ? value : String(value).split(',')
    return raw.map((s: string) => String(s).trim()).filter(Boolean)
  })
  @IsArray()
  @IsEnum(ETrialLessonStatus, { each: true })
  statusIn?: ETrialLessonStatus[]
}
