import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { JwtService } from '@nestjs/jwt'
import { MessageService } from '../message/message.service'
import { PrismaService } from '../prisma/prisma.service'

type JwtPayload = { sub: string; email: string; iat?: number; exp?: number }

@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class MessagesGateway {
  @WebSocketServer()
  server!: Server

  constructor(
    private readonly jwtService: JwtService,
    private readonly messageService: MessageService,
    private readonly prisma: PrismaService, // ✅
  ) {}

  /** 1) Проверяем JWT один раз и кладём userId в socket.data */
  private authSocket(socket: Socket): string {
    const tokenFromAuth = socket.handshake.auth?.token as string | undefined
    const authHeader = socket.handshake.headers?.authorization as string | undefined

    const token =
      tokenFromAuth ??
      (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined)

    if (!token) throw new WsException('UNAUTHORIZED')

    let payload: JwtPayload
    try {
      payload = this.jwtService.verify<JwtPayload>(token)
    } catch {
      throw new WsException('UNAUTHORIZED')
    }

    socket.data.userId = payload.sub
    socket.data.email = payload.email
    return payload.sub
  }

  /** 2) Проверяем: канал существует + юзер состоит в сервере канала */
  private async assertChannelAccess(channelId: string, userId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true, serverId: true },
    })

    if (!channel) throw new WsException('CHANNEL_NOT_FOUND')

    const member = await this.prisma.serverMember.findUnique({
      where: { userId_serverId: { userId, serverId: channel.serverId } }, // ✅ благодаря @@unique
      select: { id: true, role: true },
    })

    if (!member) throw new WsException('FORBIDDEN')

    return { channel, member }
  }

  /** (Опционально) можно отключать сразу при неверном токене */
  handleConnection(socket: Socket) {
    try {
      this.authSocket(socket)
    } catch (e) {
      socket.disconnect(true)
    }
  }

  @SubscribeMessage('channel:join')
  async joinChannel(
    @MessageBody() body: { channelId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    const userId = (socket.data.userId as string) || this.authSocket(socket)

    await this.assertChannelAccess(body.channelId, userId)

    await socket.join(body.channelId)
    return { ok: true }
  }

  @SubscribeMessage('channel:leave')
  async leaveChannel(
    @MessageBody() body: { channelId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    const userId = (socket.data.userId as string) || this.authSocket(socket)

    // leave разрешаем даже без membership-чека (можно оставить как есть)
    await socket.leave(body.channelId)
    return { ok: true }
  }

  @SubscribeMessage('message:send')
  async sendMessage(
    @MessageBody() body: { channelId: string; content: string },
    @ConnectedSocket() socket: Socket,
  ) {
    const userId = (socket.data.userId as string) || this.authSocket(socket)

    const content = (body.content ?? '').trim()
    if (!content) throw new WsException('EMPTY_MESSAGE')
    if (content.length > 2000) throw new WsException('MESSAGE_TOO_LONG')

    await this.assertChannelAccess(body.channelId, userId)

    const msg = await this.messageService.create(content, body.channelId, userId)

    this.server.to(body.channelId).emit('message:new', msg)
    return { ok: true, messageId: msg.id }
  }
}
