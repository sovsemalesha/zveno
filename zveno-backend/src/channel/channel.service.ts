import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ChannelService {
  constructor(private prisma: PrismaService) {}

  async create(name: string, serverId: string) {
    return this.prisma.channel.create({
      data: {
        name,
        serverId,
      },
    })
  }

  async findByServer(serverId: string) {
    return this.prisma.channel.findMany({
      where: { serverId },
    })
  }
}
