import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ServerService } from './server.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Controller('servers')
@UseGuards(JwtAuthGuard)
export class ServerController {
  constructor(private readonly serverService: ServerService) {}

  // 🔹 Создание сервера
  @Post()
  create(
    @Body() body: { name: string },
    @Req() req: any,
  ) {
    return this.serverService.create(body.name, req.user.userId)
  }

  // 🔹 Получить сервера пользователя
  @Get()
  getMyServers(@Req() req: any) {
    return this.serverService.getUserServers(req.user.userId)
  }

  // 🔹 Получить участников сервера
  @Get(':serverId/members')
  getMembers(
    @Param('serverId') serverId: string,
  ) {
    return this.serverService.getMembers(serverId)
  }

  // 🔹 Изменить роль (только owner)
  @Patch(':serverId/member/:userId')
  updateRole(
    @Param('serverId') serverId: string,
    @Param('userId') userId: string,
    @Body() body: { role: string },
    @Req() req: any,
  ) {
    return this.serverService.updateRole(
      serverId,
      userId,
      body.role,
      req.user.userId,
    )
  }

  // 🔹 Удалить участника
  @Delete(':serverId/member/:userId')
  removeMember(
    @Param('serverId') serverId: string,
    @Param('userId') userId: string,
    @Req() req: any,
  ) {
    return this.serverService.removeMember(
      serverId,
      userId,
      req.user.userId,
    )
  }
}
