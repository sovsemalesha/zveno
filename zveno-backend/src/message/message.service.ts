import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class MessageService {
  constructor(private prisma: PrismaService) {}

  async create(content: string, channelId: string, userId: string) {
    return this.prisma.message.create({
      data: {
        content,
        channelId,
        userId,
      },
    })
  }

  async findByChannel(channelId: string) {
    return this.prisma.message.findMany({
      where: { channelId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    })
  }
}
