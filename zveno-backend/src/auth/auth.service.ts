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
    const hashedPassword = await bcrypt.hash(data.password, 10)

    try {
      const user = await this.usersService.create({
        ...data,
        password: hashedPassword,
      })

      return { id: user.id, email: user.email, username: user.username }
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
    const users = await this.usersService.findAll()
    const user = users.find(u => u.email === email)

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
