import { UnauthorizedException } from '@nestjs/common';

export class AccountDeactivatedException extends UnauthorizedException {
  constructor(reason?: string) {
    super(
      reason
        ? `Account is deactivated: ${reason}`
        : 'Account is deactivated',
    );
  }
}
