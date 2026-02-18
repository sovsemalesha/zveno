import { Controller, Post, Param, UseGuards, Req } from '@nestjs/common'
import { InviteService } from './invite.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Controller('invites')
@UseGuards(JwtAuthGuard)
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  @Post(':serverId')
  create(
    @Param('serverId') serverId: string,
    @Req() req: any,
  ) {
    return this.inviteService.create(serverId, req.user.userId)
  }

  @Post('join/:code')
  join(
    @Param('code') code: string,
    @Req() req: any,
  ) {
    return this.inviteService.joinByCode(code, req.user.userId)
  }
}
