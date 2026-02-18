import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
        }),
    );

    // Enable CORS
    app.enableCors({
        origin: [
            'http://localhost:5173', // Frontend dev
            'https://ofeklabs.dev', // Porduction
            'https://*.ofeklabs.dev', // Subdomains
        ],
        credentials: true,
    });

    // Cookie parser
    app.use(cookieParser());

    // Versioning
    app.setGlobalPrefix('v1');

    // Swagger
    const { DocumentBuilder, SwaggerModule } = require('@nestjs/swagger');
    const config = new DocumentBuilder()
        .setTitle('Horizon Auth')
        .setDescription('Identity Provider API')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);

    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
