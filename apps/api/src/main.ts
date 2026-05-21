import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppConfigService } from './shared/services/app-config.service';
import { ValidationPipe } from '@nestjs/common';
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);
  const configService = app.get(AppConfigService);

  app.use(helmet());

  app.use(cookieParser());

  const corsOrigins =
    configService.corsOrigins
      ?.split(',')
      .map((o) => o.trim().replace(/\/$/, ''))
      .filter(Boolean) ?? [];
  const frontendOrigin = configService.frontendUrl.replace(/\/$/, '');

  let allowOrigin: boolean | string[];
  if (corsOrigins.length > 0) {
    allowOrigin = [...new Set([...corsOrigins, frontendOrigin])];
  } else if (configService.nodeEnv !== 'production') {
    allowOrigin = true;
  } else {
    allowOrigin = [frontendOrigin];
    console.warn(
      `[CORS] CORS_ORIGINS unset in production; allowing only FRONTEND_URL: ${frontendOrigin}`
    );
  }

  if (configService.nodeEnv === 'production') {
    console.info(`[CORS] Allowed origins: ${JSON.stringify(allowOrigin)}`);
  }

  app.enableCors({
    origin: allowOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  });

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
