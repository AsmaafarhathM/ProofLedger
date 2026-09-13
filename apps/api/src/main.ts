import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allowed for Swagger UI
    }),
  );

  // CORS Configuration
  const rawCors = config.get<string>('CORS_ORIGIN') || 'http://localhost:3001,http://localhost:3000';
  const origins = rawCors.split(',').map((o) => o.trim());

  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global Interceptors & Exception Filters
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // OpenAPI / Swagger Documentation Setup
  const enableSwagger = config.get<boolean>('ENABLE_SWAGGER') ?? true;
  const swaggerPath = config.get<string>('SWAGGER_PATH') || 'docs';

  if (enableSwagger) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('ProofLedger API')
      .setDescription(
        'Secure Digital Evidence Management Platform REST API with JWT Auth, Multi-tenant RBAC, SHA-256 Integrity, and Peer Review Approval Workflow.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(swaggerPath, app, document);
    logger.log(`OpenAPI Swagger documentation configured at /${swaggerPath}`);
  }

  const port = config.get<number>('API_PORT') || config.get<number>('PORT') || 3000;
  await app.listen(port);
  logger.log(`ProofLedger API server running on port ${port}`);
}

bootstrap();
