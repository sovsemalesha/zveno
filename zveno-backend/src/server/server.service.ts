import {
  Injectable,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ServerService {
  constructor(private readonly prisma: PrismaService) {}

  async create(name: string, userId: string) {
    const server = await this.prisma.server.create({
      data: {
        name,
      },
    })

    await this.prisma.serverMember.create({
      data: {
        userId,
        serverId: server.id,
        role: 'owner',
      },
    })

    return server
  }

  async getUserServers(userId: string) {
    const memberships = await this.prisma.serverMember.findMany({
      where: { userId },
      include: { server: true },
    })

    return memberships.map((m) => m.server)
  }

  async getMembers(serverId: string) {
    return this.prisma.serverMember.findMany({
      where: { serverId },
      include: { user: true },
    })
  }

  async updateRole(
    serverId: string,
    targetUserId: string,
    newRole: string,
    actorId: string,
  ) {
    const actor = await this.prisma.serverMember.findUnique({
      where: {
        userId_serverId: {
          userId: actorId,
          serverId,
        },
      },
    })

    if (!actor || actor.role !== 'owner') {
      throw new ForbiddenException('Only owner can change roles')
    }

    if (!['admin', 'member'].includes(newRole)) {
      throw new ForbiddenException('Invalid role')
    }

    return this.prisma.serverMember.update({
      where: {
        userId_serverId: {
          userId: targetUserId,
          serverId,
        },
      },
      data: {
        role: newRole,
      },
    })
  }

  async removeMember(
    serverId: string,
    targetUserId: string,
    actorId: string,
  ) {
    const actor = await this.prisma.serverMember.findUnique({
      where: {
        userId_serverId: {
          userId: actorId,
          serverId,
        },
      },
    })

    if (!actor || (actor.role !== 'owner' && actor.role !== 'admin')) {
      throw new ForbiddenException('Not allowed')
    }

    return this.prisma.serverMember.delete({
      where: {
        userId_serverId: {
          userId: targetUserId,
          serverId,
        },
      },
    })
  }
}
