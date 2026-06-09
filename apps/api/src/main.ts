import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppConfigService } from './shared/services/app-config.service';
import { ValidationPipe } from '@nestjs/common';
import {
  buildAllowedCorsOrigins,
  createCorsOriginDelegate,
} from './common/utils/cors-origin.util';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);
  const configService = app.get(AppConfigService);

  if (!configService.corsDelegateToProxy) {
    const allowedOrigins = buildAllowedCorsOrigins(
      configService.corsOrigins,
      configService.frontendUrl
    );

    app.enableCors({
      origin: createCorsOriginDelegate(allowedOrigins),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Content-Length',
        'Accept-Encoding',
        'X-CSRF-Token',
        'Authorization',
        'accept',
        'origin',
        'Cache-Control',
        'X-Requested-With',
      ],
    });
  }

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  app.use(cookieParser());

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    })
  );

  if (configService.nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Mezon tutors API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.port;
  await app.listen(port);
  console.log(`🚀 API server running on http://localhost:${port}`);
}

bootstrap();
