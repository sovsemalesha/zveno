import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { PrismaModule } from './prisma/prisma.module'
import { UsersModule } from './users/users.module'
import { AuthModule } from './auth/auth.module'
import { ServerModule } from './server/server.module'
import { ChannelModule } from './channel/channel.module'
import { MessageModule } from './message/message.module'
import { WsModule } from './ws/ws.module'
import { InviteModule } from './invite/invite.module';




@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    ServerModule,
    ChannelModule,
    MessageModule,
    MessageModule,
    WsModule,
    InviteModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
