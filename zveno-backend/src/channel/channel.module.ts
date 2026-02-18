import { Module } from '@nestjs/common'
import { ChannelService } from './channel.service'
import { ChannelController } from './channel.controller'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [ChannelController],
  providers: [ChannelService],
})
export class ChannelModule {}
