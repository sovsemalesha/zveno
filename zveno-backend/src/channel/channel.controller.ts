import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common'
import { ChannelService } from './channel.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Controller('channels')
@UseGuards(JwtAuthGuard)
export class ChannelController {
  constructor(private channelService: ChannelService) {}

  @Post()
  create(
    @Body() body: { name: string; serverId: string },
  ) {
    return this.channelService.create(body.name, body.serverId)
  }

  @Get(':serverId')
  findByServer(@Param('serverId') serverId: string) {
    return this.channelService.findByServer(serverId)
  }
}
