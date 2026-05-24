import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.WORKER_HEALTH_PORT || 3001;
  await app.listen(port);
  Logger.log(`Worker process is running on: http://localhost:${port}`);
}

void bootstrap();
