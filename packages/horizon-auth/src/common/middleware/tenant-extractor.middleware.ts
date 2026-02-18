import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantExtractorMiddleware implements NestMiddleware {
  constructor(@Inject('HORIZON_AUTH_CONFIG') private readonly config: any) {}

  use(req: Request, res: Response, next: NextFunction) {
    if (!this.config.multiTenant?.enabled) {
      return next();
    }

    const extractor = this.config.multiTenant.tenantIdExtractor || 'header';
    let tenantId: string | undefined;

    switch (extractor) {
      case 'header':
        tenantId = this.extractFromHeader(req);
        break;
      case 'subdomain':
        tenantId = this.extractFromSubdomain(req);
        break;
      case 'custom':
        if (this.config.multiTenant.customExtractor) {
          tenantId = this.config.multiTenant.customExtractor(req);
        }
        break;
    }

    // Set tenant ID on request object
    (req as any).tenantId = tenantId || this.config.multiTenant.defaultTenantId || 'default';

    next();
  }

  private extractFromHeader(req: Request): string | undefined {
    return req.headers['x-tenant-id'] as string;
  }

  private extractFromSubdomain(req: Request): string | undefined {
    const host = req.headers.host || '';
    const parts = host.split('.');
    
    // Extract subdomain (e.g., tenant1.example.com -> tenant1)
    if (parts.length > 2) {
      return parts[0];
    }
    
    return undefined;
  }
}
