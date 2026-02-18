import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    if (process.env.DATABASE_URL) {
      try {
        const dbUrl = process.env.DATABASE_URL;
        const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
        if (match) {
          const [, , , host, port, database] = match;
          this.logger.debug(`Connecting to postgresql://${host}:${port}/${database}`);
        } else {
          this.logger.debug('DATABASE_URL format detected');
        }
      } catch {
        // Ignore parsing errors
      }
    }
  }

  async onModuleInit() {
    const maxRetries = 5;
    const retryDelay = 2000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        this.logger.log('Successfully connected to database');
        return;
      } catch (err) {
        const isLastAttempt = attempt === maxRetries;
        this.logger.warn(
          `Connection attempt ${attempt}/${maxRetries} failed: ${err instanceof Error ? err.message : err}`,
        );

        if (process.env.NODE_ENV !== 'production' && isLastAttempt) {
          this.logger.error('Failed to connect on startup (dev mode)', err);
          return;
        }

        if (isLastAttempt) {
          this.logger.error('Failed to connect after all retries', err);
          throw err;
        }

        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
