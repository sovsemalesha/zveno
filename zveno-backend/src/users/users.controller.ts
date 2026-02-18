import { Controller, Post, Body, Get } from '@nestjs/common'
import { UsersService } from './users.service'
import { UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'


@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(
    @Body()
    body: { email: string; username: string; password: string },
  ) {
    return this.usersService.create(body)
  }

@UseGuards(JwtAuthGuard)
@Get()
findAll() {
  return this.usersService.findAll()
}

}
