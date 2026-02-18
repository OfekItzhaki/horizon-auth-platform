import { ForbiddenException } from '@nestjs/common';

export class FeatureDisabledException extends ForbiddenException {
  constructor(featureName: string) {
    super(`${featureName} feature is not enabled`);
  }
}
