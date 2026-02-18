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
    private readonly prisma: PrismaService,
  ) {}

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

  private async assertChannelAccess(channelId: string, userId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true, serverId: true },
    })

    if (!channel) throw new WsException('CHANNEL_NOT_FOUND')

    const member = await this.prisma.serverMember.findUnique({
      where: { userId_serverId: { userId, serverId: channel.serverId } },
      select: { id: true, role: true },
    })

    if (!member) throw new WsException('FORBIDDEN')

    return { channel, member }
  }

  handleConnection(socket: Socket) {
    try {
      this.authSocket(socket)
    } catch {
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

    // 🔥 Обновляем presence
    const sockets = await this.server.in(body.channelId).fetchSockets()

    const users = await Promise.all(
      sockets.map(async (s) => {
        const user = await this.prisma.user.findUnique({
          where: { id: s.data.userId },
          select: { username: true },
        })
        return user
      }),
    )

    this.server.to(body.channelId).emit(
      'presence:update',
      users.filter(Boolean),
    )

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

    // 🔥 ВАЖНО: создаём сообщение с include user
    const msg = await this.prisma.message.create({
      data: {
        content,
        channelId: body.channelId,
        userId,
      },
      include: {
        user: {
          select: { username: true },
        },
      },
    })

    this.server.to(body.channelId).emit('message:new', {
      id: msg.id,
      content: msg.content,
      userId: msg.userId,
      user: {
        username: msg.user.username,
      },
    })

    return { ok: true }
  }
}
