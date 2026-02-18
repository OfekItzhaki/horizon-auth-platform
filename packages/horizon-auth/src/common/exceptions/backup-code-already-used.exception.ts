import { UnauthorizedException } from '@nestjs/common';

export class BackupCodeAlreadyUsedException extends UnauthorizedException {
  constructor() {
    super('Backup code has already been used');
  }
}
