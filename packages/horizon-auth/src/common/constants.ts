/**
 * Injection token for PrismaClient
 * 
 * Applications must provide PrismaClient using this token in their @Global() PrismaModule:
 * 
 * ```typescript
 * import { PRISMA_CLIENT_TOKEN } from '@ofeklabs/horizon-auth';
 * import { PrismaClient } from '@prisma/client';
 * 
 * @Global()
 * @Module({
 *   providers: [
 *     PrismaService,
 *     {
 *       provide: PRISMA_CLIENT_TOKEN,
 *       useExisting: PrismaService,
 *     },
 *   ],
 *   exports: [PrismaService, PRISMA_CLIENT_TOKEN],
 * })
 * export class PrismaModule {}
 * ```
 */
export const PRISMA_CLIENT_TOKEN = 'PRISMA_CLIENT';
