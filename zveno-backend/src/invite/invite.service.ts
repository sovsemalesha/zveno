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

    if (member.role !== 'owner' && member.role !== 'admin') {
      throw new ForbiddenException('Only owner or admin can create invite')
    }

    const code = generateInviteCode()

    return await this.prisma.invite.create({
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
          role: 'member',
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

  async deleteInvite(code: string, userId: string) {
    const invite = await this.prisma.invite.findUnique({
      where: { code },
    })

    if (!invite) {
      throw new NotFoundException('Invite not found')
    }

    const member = await this.prisma.serverMember.findUnique({
      where: {
        userId_serverId: {
          userId,
          serverId: invite.serverId,
        },
      },
    })

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      throw new ForbiddenException('Not allowed')
    }

    await this.prisma.invite.delete({
      where: { code },
    })

    return { success: true }
  }
}
