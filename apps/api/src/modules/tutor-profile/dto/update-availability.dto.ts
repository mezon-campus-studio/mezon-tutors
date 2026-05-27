import { IsArray, ValidateNested, IsNumber, IsString, Min, Max, Matches, Validate, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { Type } from 'class-transformer';

const WALL_CLOCK_TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const WALL_CLOCK_END_TIME_REGEX = /^(([01]\d|2[0-3]):([0-5]\d)|24:00)$/;

@ValidatorConstraint({ name: 'isTimeAfter', async: false })
class IsTimeAfterConstraint implements ValidatorConstraintInterface {
  validate(endTime: string, args: ValidationArguments) {
    const startTime = (args.object as { startTime?: string }).startTime;
    if (!startTime || !endTime) return false;

    if (endTime === '24:00') {
      return WALL_CLOCK_TIME_REGEX.test(startTime);
    }

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    return endMinutes > startMinutes;
  }

  defaultMessage() {
    return 'endTime must be after startTime';
  }
}

export class AvailabilitySlotDto {
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsString()
  @Matches(WALL_CLOCK_TIME_REGEX, {
    message: 'startTime must be in HH:mm format (00:00 - 23:59)',
  })
  startTime: string;

  @IsString()
  @Matches(WALL_CLOCK_END_TIME_REGEX, {
    message: 'endTime must be in HH:mm format (00:00 - 24:00)',
  })
  @Validate(IsTimeAfterConstraint)
  endTime: string;
}

export class UpdateAvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  availability: AvailabilitySlotDto[];
}
