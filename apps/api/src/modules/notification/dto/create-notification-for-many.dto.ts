import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator'
import { CreateNotificationDto } from './create-notification.dto'

export class CreateNotificationForManyDto extends CreateNotificationDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @IsUUID('4', { each: true })
  userIds: string[]
}
