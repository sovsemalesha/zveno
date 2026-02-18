import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { PrismaModule } from './prisma/prisma.module'
import { UsersModule } from './users/users.module'
import { AuthModule } from './auth/auth.module'
import { ServerModule } from './server/server.module'
import { ChannelModule } from './channel/channel.module'
import { MessageModule } from './message/message.module'



@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    ServerModule,
    ChannelModule,
    MessageModule,
    MessageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
