import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { generateInviteCode } from '../utils/code.util'

@Injectable()
export class InviteService {
  constructor(private readonly prisma: PrismaService) {}

  async create(serverId: string, creatorId: string) {
    // Проверяем что пользователь состоит в сервере
    const member = await this.prisma.serverMember.findUnique({
      where: {
        userId_serverId: {
          userId: creatorId,
          serverId,
        },
      },
    })

    if (!member) {
      throw new ForbiddenException('Not a server member')
    }

    const code = generateInviteCode()

    return await this.prisma.invite.create({
      data: {
        code,
        serverId,
        uses: 0,
      },
    })
  }

  async joinByCode(code: string, userId: string) {
    const invite = await this.prisma.invite.findUnique({
      where: { code },
    })

    if (!invite) {
      throw new NotFoundException('Invalid invite')
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new ForbiddenException('Invite expired')
    }

    if (invite.maxUses && invite.uses >= invite.maxUses) {
      throw new ForbiddenException('Invite limit reached')
    }

    const existingMember = await this.prisma.serverMember.findUnique({
      where: {
        userId_serverId: {
          userId,
          serverId: invite.serverId,
        },
      },
    })

    if (!existingMember) {
      await this.prisma.serverMember.create({
        data: {
          userId,
          serverId: invite.serverId,
          role: 'MEMBER',
        },
      })
    }

    await this.prisma.invite.update({
      where: { id: invite.id },
      data: {
        uses: { increment: 1 },
      },
    })

    return { success: true, serverId: invite.serverId }
  }
}
