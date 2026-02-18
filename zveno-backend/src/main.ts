import 'dotenv/config'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Включаем валидацию DTO (не ломает существующие ручные body-объекты,
  // но позволит нормально валидировать /auth/register через RegisterDto)
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      // не включаем whitelist/forbidNonWhitelisted, чтобы случайно не поломать существующие запросы
    }),
  )

  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  })

  await app.listen(3000)
}
bootstrap()
