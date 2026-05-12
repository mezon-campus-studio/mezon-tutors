import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'

export class ReplaceTutorSubscriptionPlanItemBodyDto {
  @IsOptional()
  @IsUUID()
  id?: string

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  lessonsPerWeek: number

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyPrice: number
}

export class ReplaceTutorSubscriptionPlansBodyDto {
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => ReplaceTutorSubscriptionPlanItemBodyDto)
  plans: ReplaceTutorSubscriptionPlanItemBodyDto[]
}
