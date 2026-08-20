import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cors from 'cors';

async function bootstrap() {
  // Preserve the original bytes for signed provider webhooks. JSON parsing
  // normalizes whitespace and must never be used as the HMAC input.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Configure trusted proxy (e.g. loopback Nginx in production or TRUST_PROXY setting)
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', process.env.TRUST_PROXY || 'loopback');

  // Security Middleware
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }));
  const configuredOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  if (process.env.NODE_ENV === 'production' && configuredOrigins.length === 0) {
    throw new Error('CORS_ORIGINS is required in production.');
  }
  app.use(cors({
    origin: (origin, callback) => {
      // Server-to-server traffic (webhooks, health checks) has no Origin.
      if (!origin || (process.env.NODE_ENV !== 'production' && configuredOrigins.length === 0) || configuredOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS origin is not allowed.'));
    },
    credentials: true
  }));

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('Zayuno Action Layer API')
    .setDescription('Capability-based Action Infrastructure bridging AI Agents (ChatGPT, Claude, Gemini) with external capability providers.')
    .setVersion('1.0.0')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
    .addBearerAuth()
    .build();

  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.API_PORT || 4000;
  await app.listen(port);

  console.log(`\n🚀 ===============================================`);
  console.log(`🚀 Zayuno Public API running on: http://localhost:${port}`);
  console.log(`📚 Swagger Interactive Docs at: http://localhost:${port}/api/docs`);
  console.log(`⚡ Action Engine Ready for AI Agents & Providers`);
  console.log(`===============================================\n`);
}

bootstrap();
