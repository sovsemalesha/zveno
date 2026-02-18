import { Controller, Post, Body, UseGuards, Get, Req } from '@nestjs/common'
import { ServerService } from './server.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Controller('servers')
@UseGuards(JwtAuthGuard)
export class ServerController {
  constructor(private serverService: ServerService) {}

  @Post()
  create(@Body() body: { name: string }, @Req() req: any) {
    const userId = req.user.userId
    return this.serverService.create(body.name, userId)
  }

  @Get()
  findMyServers(@Req() req: any) {
    const userId = req.user.userId
    return this.serverService.findAllForUser(userId)
  }
}
