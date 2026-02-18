import { UnauthorizedException } from '@nestjs/common';

export class TwoFactorRequiredException extends UnauthorizedException {
  constructor(public readonly userId: string) {
    super('Two-factor authentication is required');
  }
}
