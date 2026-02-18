import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { UsersService } from '../users/users.service'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { Prisma } from '@prisma/client'

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(data: { email: string; username: string; password: string }) {
    // Нормализуем email (чтобы user@a.com и USER@A.COM не плодились)
    const email = data.email.trim().toLowerCase()
    const username = data.username.trim()

    try {
      // UsersService САМ хеширует пароль. Здесь хешировать нельзя (иначе будет двойной хеш).
      const user = await this.usersService.create({
        email,
        username,
        password: data.password,
      })

      const payload = { sub: user.id, email: user.email }

      return {
        access_token: this.jwtService.sign(payload),
        user: { id: user.id, email: user.email, username: user.username },
      }
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

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase()
    const user = await this.usersService.findByEmail(normalizedEmail)

    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const payload = { sub: user.id, email: user.email }

    return {
      access_token: this.jwtService.sign(payload),
    }
  }
}
