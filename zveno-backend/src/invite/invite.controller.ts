import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common'
import { InviteService } from './invite.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Controller('invites')
@UseGuards(JwtAuthGuard)
export class InviteController {
  constructor(private inviteService: InviteService) {}

  @Post('create')
  create(
    @Body() body: { serverId: string },
    @Req() req: any,
  ) {
    return this.inviteService.create(body.serverId, req.user.userId)
  }

  @Post('join')
  join(
    @Body() body: { code: string },
    @Req() req: any,
  ) {
    return this.inviteService.joinByCode(body.code, req.user.userId)
  }
}
