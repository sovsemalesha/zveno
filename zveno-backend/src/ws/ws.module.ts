import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { MessagesGateway } from './messages.gateway'
import { MessageModule } from '../message/message.module'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [
    PrismaModule,
    MessageModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET as string,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [MessagesGateway],
})
export class WsModule {}
