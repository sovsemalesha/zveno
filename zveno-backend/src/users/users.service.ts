import { Injectable, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as bcrypt from 'bcrypt'
import { Prisma } from '@prisma/client'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    email: string
    username: string
    password: string
  }) {
    // ВАЖНО: UsersService отвечает за хеширование пароля.
    // AuthService НЕ должен дополнительно хешировать пароль, иначе получится двойной хеш.
    const hashedPassword = await bcrypt.hash(data.password, 10)

    try {
      return await this.prisma.user.create({
        data: {
          ...data,
          password: hashedPassword,
        },
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already exists')
      }

      throw error
    }
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } })
  }

  async findAll() {
    return this.prisma.user.findMany()
  }
}
