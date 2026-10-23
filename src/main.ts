import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { AppModule } from 'src/app.module';
import { AppConfigService } from 'src/config/app-config.service';
import { LoggerService } from 'src/core/logger/logger.service';

async function bootstrap() {
  const logger = new LoggerService();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { logger },
  );

  const appConfig = app.get(AppConfigService);

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.enableCors({
    origin: true,
  });

  //what and why
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = appConfig.port;
  await app.listen(port, '0.0.0.0');
  logger.log(`Backend listening on http://localhost:${port}`, 'Bootstrap');
}

bootstrap();
