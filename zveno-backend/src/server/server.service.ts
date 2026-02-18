import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ServerService {
  constructor(private prisma: PrismaService) {}

  async create(name: string, userId: string) {
    return this.prisma.server.create({
      data: {
        name,
        members: {
          create: {
            userId,
            role: 'owner',
          },
        },
      },
      include: {
        members: true,
      },
    })
  }

  async findAllForUser(userId: string) {
    return this.prisma.server.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
    })
  }
}
