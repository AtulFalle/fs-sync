import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('FS Sync API')
    .setDescription(
      'Google Drive metadata synchronization API. OAuth connects a Drive account, Google webhooks enqueue fast sync jobs, and workers process changes.list into PostgreSQL metadata.',
    )
    .setVersion('1.0.0')
    .addTag(
      'Organizations',
      'Local organization setup for provider connections.',
    )
    .addTag(
      'Google Drive OAuth',
      'Google Drive OAuth consent, token exchange, start page token, and watch registration.',
    )
    .addTag(
      'Google Drive Webhooks',
      'Fast Google Drive push notification endpoint. Uses X-Goog-* headers; body may be empty.',
    )
    .addTag(
      'Watch Sources',
      'Google Drive watch sources and manual sync triggers.',
    )
    .addTag(
      'Files',
      'Synced Google Drive metadata and deferred download job requests.',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${globalPrefix}/docs`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
  Logger.log(
    `Swagger docs are available at: http://localhost:${port}/${globalPrefix}/docs`,
  );
}

void bootstrap();
