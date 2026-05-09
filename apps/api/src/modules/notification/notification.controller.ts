import { Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import type { AuthUserPayload } from '../auth/interfaces/auth.interfaces'
import { GetMyNotificationsDto } from './dto/get-my-notifications.dto'
import { NotificationService } from './notification.service'

@Controller('notifications')
@ApiTags('Notification')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getMyNotifications(@Req() req: Request, @Query() query: GetMyNotificationsDto) {
    const user = req.user as AuthUserPayload
    return this.notificationService.getMyNotifications(user.sub, query)
  }

  @Patch(':id/read')
  async markAsRead(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as AuthUserPayload
    await this.notificationService.markAsRead(id, user.sub)
    return { success: true }
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req: Request) {
    const user = req.user as AuthUserPayload
    await this.notificationService.markAllAsRead(user.sub)
    return { success: true }
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: Request) {
    const user = req.user as AuthUserPayload
    return this.notificationService.getUnreadCount(user.sub)
  }
}
