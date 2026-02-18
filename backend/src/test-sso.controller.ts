import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser, Public } from '@ofeklabs/horizon-auth';

@Controller('test-sso')
export class TestSsoController {
  @Public()
  @Get('public')
  publicRoute() {
    return {
      message: 'This is a public route - no auth required',
      timestamp: new Date().toISOString(),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('protected')
  protectedRoute(@CurrentUser() user: any) {
    return {
      message: 'This is a protected route - auth required!',
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
