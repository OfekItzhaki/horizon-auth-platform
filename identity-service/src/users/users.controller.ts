import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { JwtAuthGuard, CurrentUser, CurrentUserPayload } from '../auth/jwt-utils';

@Controller('users')
export class UsersController {
  constructor(private userService: UsersService) { }

  @Post()
  async createUser(@Body() data: CreateUserDto) {
    return this.userService.createUser(data);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getCurrentUser(@CurrentUser() user: CurrentUserPayload) {
    return this.userService.findUserById(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('search')
  async searchUsers(@Param('email') email: string) {
    return this.userService.searchUsers(email);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getUser(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    if (id !== user.userId) throw new BadRequestException('Unauthorized');
    return this.userService.findUserById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateUser(@Param('id') id: string, @Body() data: UpdateUserDto, @CurrentUser() user: CurrentUserPayload) {
    if (id !== user.userId) throw new BadRequestException('Unauthorized');
    return this.userService.updateUser(id, data);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteUser(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    if (id !== user.userId) throw new BadRequestException('Unauthorized');
    // Implementation for soft delete
    return { message: 'User deleted' };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/upload-avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (id !== user.userId) throw new BadRequestException('Unauthorized');
    if (!file) throw new BadRequestException('No file uploaded');

    // Placeholder implementation
    return {
      message: 'Avatar upload received (stub)',
      profilePicture: 'https://via.placeholder.com/150'
    };
  }
}
