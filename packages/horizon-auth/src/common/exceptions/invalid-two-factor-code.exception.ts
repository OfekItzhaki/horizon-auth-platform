import { UnauthorizedException } from '@nestjs/common';

export class InvalidTwoFactorCodeException extends UnauthorizedException {
  constructor() {
    super('Invalid two-factor authentication code');
  }
}
