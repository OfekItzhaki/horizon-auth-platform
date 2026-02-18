import { Injectable, OnModuleDestroy, Inject } from '@nestjs/common';
import Redis from 'ioredis';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly keyPrefix = 'auth:blacklist:';

  constructor(@Inject('HORIZON_AUTH_CONFIG') private readonly config: any) {
    this.client = new Redis({
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
      db: this.config.redis.db || 0,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.client.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    this.client.on('connect', () => {
      console.log('Redis connected successfully');
    });
  }

  /**
   * Add a token to the blacklist
   * @param tokenId - Token JTI
   * @param ttlSeconds - Time to live in seconds
   */
  async blacklist(tokenId: string, ttlSeconds: number): Promise<void> {
    const key = this.keyPrefix + tokenId;
    await this.client.setex(key, ttlSeconds, '1');
  }

  /**
   * Check if a token is blacklisted
   * @param tokenId - Token JTI
   * @returns True if blacklisted
   */
  async isBlacklisted(tokenId: string): Promise<boolean> {
    const key = this.keyPrefix + tokenId;
    const result = await this.client.get(key);
    return result !== null;
  }

  /**
   * Remove a token from blacklist (manual cleanup)
   * @param tokenId - Token JTI
   */
  async unblacklist(tokenId: string): Promise<void> {
    const key = this.keyPrefix + tokenId;
    await this.client.del(key);
  }

  /**
   * Get Redis health status
   * @returns Health check result
   */
  async healthCheck(): Promise<HealthStatus> {
    try {
      const start = Date.now();
      await this.client.ping();
      const latency = Date.now() - start;

      return {
        status: 'healthy',
        latency,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    await this.client.quit();
  }
}
