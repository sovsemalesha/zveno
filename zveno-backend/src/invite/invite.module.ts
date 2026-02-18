import { Module } from '@nestjs/common'
import { InviteService } from './invite.service'
import { InviteController } from './invite.controller'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [InviteController],
  providers: [InviteService],
})
export class InviteModule {}
