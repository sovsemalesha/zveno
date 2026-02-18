import { Module } from '@nestjs/common'
import { ServerService } from './server.service'
import { ServerController } from './server.controller'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [ServerController],
  providers: [ServerService],
})
export class ServerModule {}
