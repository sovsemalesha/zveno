import { Controller, Post, Body, UseGuards, Get, Param, Req } from '@nestjs/common'
import { MessageService } from './message.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(private messageService: MessageService) {}

  @Post()
  create(
    @Body() body: { content: string; channelId: string },
    @Req() req: any,
  ) {
    const userId = req.user.userId
    return this.messageService.create(body.content, body.channelId, userId)
  }

  @Get(':channelId')
  findByChannel(@Param('channelId') channelId: string) {
    return this.messageService.findByChannel(channelId)
  }
}
