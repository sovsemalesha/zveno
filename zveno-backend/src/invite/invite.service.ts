import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { generateInviteCode } from '../utils/code.util'

@Injectable()
export class InviteService {
  constructor(private prisma: PrismaService) {}

  async create(serverId: string, creatorId: string) {
    // Проверяем что creator — member сервера
    const member = await this.prisma.serverMember.findUnique({
      where: { userId_serverId: { userId: creatorId, serverId } },
    })

    if (!member) throw new ForbiddenException('Not a server member')

    const code = generateInviteCode()

    return this.prisma.invite.create({
      data: {
        code,
        serverId,
      },
    })
  }

  async joinByCode(code: string, userId: string) {
    const invite = await this.prisma.invite.findUnique({
      where: { code },
    })

    if (!invite) throw new NotFoundException('Invalid invite')

    if (invite.expiresAt && invite.expiresAt < new Date())
      throw new ForbiddenException('Invite expired')

    if (invite.maxUses && invite.uses >= invite.maxUses)
      throw new ForbiddenException('Invite limit reached')

    // Проверяем не состоит ли уже
    const existing = await this.prisma.serverMember.findUnique({
      where: {
        userId_serverId: {
          userId,
          serverId: invite.serverId,
        },
      },
    })

    if (!existing) {
      await this.prisma.serverMember.create({
        data: {
          userId,
          serverId: invite.serverId,
          role: 'member',
        },
      })
    }

    await this.prisma.invite.update({
      where: { id: invite.id },
      data: { uses: { increment: 1 } },
    })

    return { success: true, serverId: invite.serverId }
  }
}
