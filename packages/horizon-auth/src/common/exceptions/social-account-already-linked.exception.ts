import { ConflictException } from '@nestjs/common';

export class SocialAccountAlreadyLinkedException extends ConflictException {
  constructor(provider: string) {
    super(`This ${provider} account is already linked to another user`);
  }
}
